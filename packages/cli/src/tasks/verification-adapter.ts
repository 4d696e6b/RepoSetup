import { realpath } from "node:fs/promises";
import path from "node:path";
import {
  taskFailure,
  taskContentHash,
  qualifiedTaskCheckSchema,
  type QualifiedTaskCheck,
  validateTaskVerificationPolicy,
  type TaskParseResult,
  type TaskVerificationAdapter,
  type TaskVerificationPolicy,
} from "@reposetup/core";
import { readTaskClosureInventory } from "./verifier-closure.js";
import { verifyQualifiedTaskCheck } from "./check-qualification.js";
import { createTaskVerifierSnapshotReader } from "./verifier-snapshot.js";
import { allocateTaskVerifierScratch } from "./verifier-scratch.js";
import { createTaskCheckRecipe } from "./check-recipes.js";
import { prepareTaskReportReader } from "./verifier-report.js";
import { parseTaskToolReport } from "./check-reports.js";

/** Construct read-only ports. Concrete writes/processes are invoked exclusively by the core executor. */
export async function createQualifiedTaskVerificationAdapter(input: {
  projectRoot: string;
  scratchParent: string;
  policy: TaskVerificationPolicy;
  checks: readonly QualifiedTaskCheck[];
  review?: TaskVerificationAdapter["review"];
}): Promise<TaskParseResult<TaskVerificationAdapter>> {
  try {
    const policy = validateTaskVerificationPolicy(input.policy);
    const checks = qualifiedTaskCheckSchema.array().length(3).safeParse(input.checks);
    if (!policy.success) return policy;
    if (!checks.success || new Set(checks.data.map((q) => q.fileDefinition.checkId)).size !== 3)
      return taskFailure(
        "TASK_CHECK_BLOCKED",
        "All three independently qualified tool checks are required.",
      );
    const qualified = checks.data;
    if (
      qualified.some(
        (q) =>
          q.projectRoot !== input.projectRoot ||
          !policy.data.definitions.some(
            (d) =>
              d.checkId === q.fileDefinition.checkId &&
              d.authority === "executor" &&
              d.definitionRevision === q.definitionRevision,
          ),
      )
    )
      return taskFailure(
        "TASK_CHECK_DEFINITION_CHANGED",
        "Qualified tools differ from the independently reviewed catalog/project.",
      );
    for (const q of qualified) {
      const required = policy.data.definitions.find(
        (d) => d.checkId === q.fileDefinition.checkId,
      )!.requiredTestIds;
      if (
        required.length !== q.testBindings.length ||
        q.testBindings.some((b) => !required.includes(b.testId))
      )
        return taskFailure(
          "TASK_CHECK_BLOCKED",
          "Required test identities differ from the reviewed frozen oracle bindings.",
        );
    }
    const projectRoot = input.projectRoot;
    const scratchParent = input.scratchParent;
    const review = input.review;
    const reader = await createTaskVerifierSnapshotReader(projectRoot);
    if (!reader.success) return reader;
    const verifyDefinitions: TaskVerificationAdapter["verifyDefinitions"] = async () => {
      // Reuse only within this single audit, never between launches/audits.
      const inventories = new Map<string, Awaited<ReturnType<typeof readTaskClosureInventory>>>();
      const readInventory: typeof readTaskClosureInventory = async (roots) => {
        const key = taskContentHash(roots);
        const previous = inventories.get(key);
        if (previous) return previous;
        const current = await readTaskClosureInventory(roots);
        inventories.set(key, current);
        return current;
      };
      for (const q of qualified) {
        const checked = await verifyQualifiedTaskCheck(q, readInventory);
        if (!checked.success) return checked;
        const dependencyRoot = await realpath(path.join(projectRoot, "node_modules"));
        if (!q.immutableRootIds.some((id) => q.roots[id] === dependencyRoot))
          return taskFailure(
            "TASK_CHECK_BLOCKED",
            "Project dependencies must be a completely inventoried immutable root.",
          );
      }
      return { success: true, data: true };
    };
    return {
      success: true,
      data: {
        snapshot: reader.data.snapshot,
        verifyDefinitions,
        ...(review === undefined ? {} : { review }),
        async prepare(checkId) {
          const q = qualified.find((c) => c.fileDefinition.checkId === checkId)!;
          const checked = await verifyQualifiedTaskCheck(q);
          if (!checked.success) return checked;
          const scratch = await allocateTaskVerifierScratch(scratchParent, [
            projectRoot,
            ...Object.values(q.roots),
          ]);
          if (!scratch.success) return scratch;
          try {
            const recipe = createTaskCheckRecipe({
              ...q,
              checkId,
              homeDirectory: scratch.data.homeDirectory,
              temporaryDirectory: scratch.data.temporaryDirectory,
            });
            if (recipe.recipeRevision !== q.fileDefinition.recipeRevision)
              throw new Error("recipe drift");
            const report =
              recipe.reportPath === null
                ? null
                : await prepareTaskReportReader(scratch.data.temporaryDirectory);
            if (report !== null && !report.success) {
              await scratch.data.dispose();
              return report;
            }
            return {
              success: true,
              data: {
                request: recipe.request,
                dispose: scratch.data.dispose,
                async readEvidence(result) {
                  const read = report !== null && report.success ? await report.data.read() : null;
                  if (read !== null && !read.success) return read;
                  const parsed = parseTaskToolReport({
                    checkId,
                    result,
                    projectRoot,
                    expectedLintTargets: q.targets,
                    ...(read !== null && read.success ? { reportText: read.data } : {}),
                  });
                  if (!parsed.success) return parsed;
                  return {
                    success: true,
                    data: {
                      reportStatus: parsed.data.valid ? "valid" : "invalid",
                      outputHash: parsed.data.outputHash,
                      testInventory: parsed.data.inventory,
                    },
                  };
                },
              },
            };
          } catch {
            await scratch.data.dispose();
            return taskFailure("TASK_CHECK_BLOCKED", "Trusted check could not be prepared.");
          }
        },
      },
    };
  } catch {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Trusted verification adapter is unavailable or unsafe.",
    );
  }
}
