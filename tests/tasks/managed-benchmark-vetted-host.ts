import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  taskByteHash,
  taskContentHash,
  type TaskPlan,
  type TaskProviderAdapter,
  type TaskReview,
  type TaskReviewRequest,
} from "../../packages/core/dist/index.js";
import { createTaskRunAdapter } from "../../packages/cli/src/tasks/application-adapter.js";
import { createTaskGitFixture } from "../../packages/cli/src/tasks/git-fixture.test-helper.js";
import { fixtureRoot } from "./fixture-tools.js";
import { createManagedBenchmarkFailureHost, strong } from "./managed-benchmark-host.js";
import {
  checked,
  createQualifiedFixtureHost,
  createQualifiedReferenceFixture,
} from "./qualified-fixture.js";

/** Test-only one successful fixed trial. Proposed code is independently vetted:
 * frozen reference bytes or an optional safe faulty variant derived from them.
 * Whole/routed remain failures with simulated definition ports.
 * This is neither arbitrary candidate isolation nor a three-treatment qualification. */
export async function createManagedBenchmarkVettedHost(
  parent: string,
  options: { contextAndRepair?: true } = {},
) {
  const started = performance.now();
  const base = createManagedBenchmarkFailureHost(parent);
  const tools = await createQualifiedFixtureHost();
  try {
    const fixture = await createQualifiedReferenceFixture(tools, base.f);
    // Hydration only. All subsequent candidate changes use the managed executor.
    for (const file of base.f.referenceFiles)
      await writeFile(
        path.join(fixture.project, file.path),
        await readFile(path.join(fixtureRoot, base.f.fixtureId, "seed", file.path)),
      );
    const outer = path.dirname(fixture.project),
      stateRoot = path.join(outer, "state");
    await mkdir(stateRoot, { mode: 0o700 });
    const git = await createTaskGitFixture(fixture.project, outer, { addPrerequisites: false });
    const adapter = checked(
      await createTaskRunAdapter({
        projectRoot: fixture.project,
        stateRoot,
        authority: fixture.compilationPolicy.authority,
      }),
    );
    const snapshot = checked(await adapter.snapshot());
    const review: TaskReview = {
      kind: "task_review",
      schemaVersion: 1,
      policy: fixture.compilationPolicy,
      phase: fixture.plan.phase,
      project: {
        rootIdentity: snapshot.rootIdentity,
        baselineCommit: git.baselineCommit,
        baselineTreeHash: taskContentHash(snapshot.entries),
      },
    };
    let fixedPlan: TaskPlan | undefined,
      reviews = 0;
    const reviewer = async (request: TaskReviewRequest) => {
      reviews++;
      if (!fixedPlan || request.planId !== fixedPlan.planId)
        throw new Error("Review plan binding changed");
      const target = request.target;
      const task =
        target.type === "task"
          ? fixedPlan.tasks.find((t) => t.taskId === target.taskId)
          : undefined;
      const definition = fixture.policy.definitions.find((d) => d.checkId === request.checkId);
      const requiredCriteria =
        target.type === "task"
          ? task?.criteria.map((c) => c.criterionId)
          : fixedPlan.phase.phaseCriteria.map((c) => c.criterionId);
      if (
        !definition ||
        request.definitionRevision !== definition.definitionRevision ||
        !requiredCriteria ||
        requiredCriteria.some((id) => !definition.criterionIds.includes(id)) ||
        taskContentHash([...request.criterionIds].sort()) !==
          taskContentHash([...definition.criterionIds].sort())
      )
        throw new Error("Review criteria changed");
      if (
        (request.target.type === "task" && request.checkId !== "task.acceptance") ||
        (request.target.type === "phase" &&
          (request.checkId !== "phase.acceptance" ||
            request.target.phaseId !== fixedPlan.phase.phaseId))
      )
        throw new Error("Review target changed");
      // The result task is independently reviewed against its owned interface file;
      // page and phase require both reference modules. No hidden oracle feedback.
      const required =
        request.target.type === "task" && task?.taskId === "result"
          ? base.f.referenceFiles.filter((f) => f.path === "src/result.ts")
          : base.f.referenceFiles;
      let approved = required.length > 0;
      for (const file of required)
        approved &&=
          taskByteHash(await readFile(path.join(fixture.project, file.path))) === file.fileHash;
      return {
        request,
        approved,
        evidenceArtifactIds: approved ? ["frozen-reference-evidence"] : [],
      };
    };
    const fixed = {
      project: fixture.project,
      stateRoot,
      git,
      adapter,
      snapshot,
      review,
      verifier: { ...fixture.adapter, review: reviewer },
      setupMs: Math.ceil(performance.now() - started),
    };
    const oldText = await readFile(
        path.join(fixtureRoot, base.f.fixtureId, "seed/src/page.ts"),
        "utf8",
      ),
      newText = await readFile(
        path.join(fixtureRoot, base.f.fixtureId, "reference/src/page.ts"),
        "utf8",
      );
    // Independently authored, safe failure injection: return success for invalid
    // items. Real public unit checks must reject it before the repair is requested.
    const faultyText = newText.replace(
      "  issues.sort((a, b) =>",
      "  if (issues.length) return { ok: true, value: { items, nextCursor: null } };\n  issues.sort((a, b) =>",
    );
    if (faultyText === newText) throw new Error("Vetted failure injection anchor changed");
    const configHash = taskByteHash(await readFile(path.join(fixture.project, "tsconfig.json")));
    let requestedContext = false,
      injectedFailure = false;
    const taskDraft: typeof base.taskDraft = (review, whole) => {
      const draft = base.taskDraft(review, whole);
      // The optional agent-test path is writable authority, not an output promised
      // by this vetted draft. The page task promises its actual module artifact.
      return whole
        ? draft
        : {
            ...draft,
            tasks: draft.tasks.map((task) =>
              task.taskId !== "page"
                ? task
                : {
                    ...task,
                    outputs: task.outputs.map((output) => ({ ...output, paths: ["src/page.ts"] })),
                  },
            ),
          };
    };
    const provider: typeof base.provider = (configuration, mode) => {
      const original = base.provider(configuration, mode);
      if (mode === "compile")
        return {
          ...original,
          dispatch: async (prepared) => ({
            ...(await original.dispatch(prepared)),
            document: taskDraft(base.roots.source!.review, false),
          }),
        };
      if (mode !== "refused" || configuration.modelProfileId !== strong.modelProfileId)
        return original;
      return {
        ...original,
        dispatch: async (prepared) => {
          const observed = await original.dispatch(prepared); // Count/retain simulated intent, not a network call.
          const input = JSON.parse(prepared.payload) as {
            identity: { planId: string; taskId: string; attemptId: string; inputRevision: string };
            repair?: { action: string; retainedEffects: { path: string; afterHash: string }[] };
          };
          if (
            !fixedPlan ||
            input.identity.planId !== fixedPlan.planId ||
            !["result", "page"].includes(input.identity.taskId)
          )
            throw new Error("Vetted provider input changed");
          if (options.contextAndRepair && input.identity.taskId === "result" && !requestedContext) {
            requestedContext = true;
            return {
              ...observed,
              outcome: "completed",
              document: {
                kind: "task_provider_reply",
                schemaVersion: 1,
                ...input.identity,
                reply: {
                  type: "context_request",
                  references: [
                    {
                      source: { path: "tsconfig.json", fileHash: configHash },
                      reason: "Inspect the unchanged compiler settings for the Result interface.",
                    },
                  ],
                },
              },
            };
          }
          let before = oldText,
            after = newText;
          if (options.contextAndRepair && input.identity.taskId === "page") {
            if (!injectedFailure) {
              if (input.repair)
                throw new Error("Initial vetted proposal unexpectedly has repair evidence");
              injectedFailure = true;
              after = faultyText;
            } else {
              if (
                input.repair?.action !== "repair_implementation" ||
                !input.repair.retainedEffects.some(
                  (effect) =>
                    effect.path === "src/page.ts" && effect.afterHash === taskByteHash(faultyText),
                )
              )
                throw new Error("Repair is not bound to the retained vetted failed edit");
              before = faultyText;
            }
          }
          const changes = [
            {
              type: "replace_text",
              path: "src/page.ts",
              expectedFileHash: taskByteHash(before),
              oldText: before,
              newText: after,
            },
          ];
          return {
            ...observed,
            outcome: "completed",
            document: {
              kind: "task_provider_reply",
              schemaVersion: 1,
              ...input.identity,
              reply:
                input.identity.taskId === "result"
                  ? {
                      type: "no_change",
                      rationale:
                        "The frozen Result interface already satisfies the assigned requirement.",
                    }
                  : {
                      type: "change_set",
                      changeSet: {
                        kind: "change_set",
                        schemaVersion: 1,
                        ...input.identity,
                        changes,
                        changeSetId: taskContentHash({
                          kind: "change_set",
                          schemaVersion: 1,
                          ...input.identity,
                          changes,
                        }),
                      },
                    },
            },
          };
        },
      } satisfies TaskProviderAdapter;
    };
    return {
      ...base,
      taskDraft,
      policy: fixture.compilationPolicy,
      verificationPolicy: fixture.policy,
      fresh: async (name: string) => {
        if (name === "fixed") {
          base.projectRoots.push(fixed.project);
          return fixed;
        }
        const root = await base.fresh(name);
        return {
          ...root,
          review: { ...root.review, policy: fixture.compilationPolicy, phase: fixture.plan.phase },
        };
      },
      provider,
      onPlan(treatment: string, plan: TaskPlan) {
        if (treatment === "fixed") {
          if (
            plan.project.baselineCommit !== git.baselineCommit ||
            plan.checkCatalogRevision !== fixture.policy.catalogRevision
          )
            throw new Error("Vetted plan baseline/catalog changed");
          fixedPlan = plan;
        }
      },
      disposeHost: tools.dispose,
      closureRevision: tools.closure.revision,
      reviews: () => reviews,
      sharedHostSetupMs: fixed.setupMs,
      diagnosticVariant: options.contextAndRepair ? "context_and_repair" : "reference_only",
      faultyPageHash: taskByteHash(faultyText),
    };
  } catch (error) {
    await tools.dispose();
    throw error;
  }
}
