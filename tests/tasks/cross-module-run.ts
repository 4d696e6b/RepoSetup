import { cp, mkdir, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  compileTaskPlan,
  executeTaskRun,
  taskByteHash,
  taskContentHash,
  taskVerificationCatalogHash,
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  type Task,
  type TaskCompilationPolicy,
  type TaskRunOperation,
  type TaskVerificationAdapter,
  type TaskVerificationPolicy,
  type TaskParseResult,
} from "../../packages/core/dist/index.js";
import { createTaskRunAdapter } from "../../packages/cli/src/tasks/application-adapter.js";
import { fixtureManifest, fixtureRoot } from "./fixture-tools.js";

export function checked<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data;
}
export const CROSS_CONFIGURATION = {
  adapterId: "openai-responses-v1",
  providerId: "openai-responses-v1" as const,
  modelProfileId: "offline-simulated",
  nativeEffortId: "low",
};
/** Dependency lifecycle test only: real filesystem/state, simulated checks, no provider. */
export async function createCrossModuleRun() {
  const outer = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-cross-")));
  try {
    const manifest = await fixtureManifest("cross-module-order-v1");
    const frozen = JSON.parse(
      await readFile(path.join(fixtureRoot, manifest.fixtureId, "manifest.json"), "utf8"),
    );
    if (taskContentHash(manifest) !== taskContentHash(frozen)) throw new Error("Stale fixture");
    const project = path.join(outer, "project"),
      stateRoot = path.join(outer, "state");
    await cp(path.join(fixtureRoot, manifest.fixtureId, "seed"), project, { recursive: true });
    await mkdir(stateRoot, { mode: 0o700 });
    const phaseText = await readFile(path.join(project, "docs/phase.md"), "utf8");
    const phaseHash = taskByteHash(phaseText);
    const groups = [
      { taskId: "domain", paths: ["src/domain.ts"], requirementIds: ["cross-1"] },
      { taskId: "totals", paths: ["src/totals.ts"], requirementIds: ["cross-2"] },
      { taskId: "presenter", paths: ["src/presenter.ts"], requirementIds: ["cross-3", "cross-4"] },
    ];
    const definitions: TaskVerificationPolicy["definitions"] = TASK_CHECK_IDS.map((checkId) => ({
      checkId,
      definitionRevision: taskContentHash({
        fixtureRevision: manifest.fixtureRevision,
        checkId,
        simulated: true,
      }),
      authority: checkId.endsWith("acceptance") ? "reviewer" : "executor",
      criterionIds: [
        ...manifest.requirements.map((r) => `${r.requirementId}-task`),
        ...manifest.requirements.map((r) => `${r.requirementId}-phase`),
      ],
      requiredTestIds: checkId === "ts.unit" ? ["simulated-lifecycle-check"] : [],
      evidenceArtifactIds: ["simulated-lifecycle-evidence"],
    }));
    const verificationPolicy: TaskVerificationPolicy = {
      schemaVersion: 1,
      definitions,
      catalogRevision: taskVerificationCatalogHash(definitions),
    };
    const authority = {
      read: manifest.seedFiles.map((f) => ({ type: "file" as const, path: f.path })),
      write: manifest.write,
      deny: [],
    };
    const policy: TaskCompilationPolicy = {
      supportProfileId: "managed-ts-node-v1",
      supportProfileRevision: 1,
      checkCatalogRevision: verificationPolicy.catalogRevision,
      checkIds: [...TASK_CHECK_IDS],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      authority,
      caseSensitivePaths: true,
    };
    const tasks: Task[] = groups.map((g, index) => ({
      taskId: g.taskId,
      objective: `Implement ${g.taskId} contract`,
      kind: "implementation",
      requirementIds: g.requirementIds,
      constraints: [],
      scope: {
        read: [
          "AGENTS.md",
          "docs/phase.md",
          ...groups.slice(0, index + 1).flatMap((g) => g.paths),
        ].map((path) => ({ type: "file" as const, path })),
        write: g.paths,
        deny: [],
      },
      criteria: g.requirementIds.map((requirementId) => ({
        criterionId: `${requirementId}-task`,
        statement: manifest.requirements.find((r) => r.requirementId === requirementId)!.text,
        requirementIds: [requirementId],
        evidenceKind: "reviewer_evidence" as const,
        checkIds: ["task.acceptance"],
      })),
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      outputs: [
        {
          artifactId: `${g.taskId}-output`,
          kind: "file_snapshot",
          paths: g.paths,
          criterionIds: g.requirementIds.map((id) => `${id}-task`),
        },
      ],
      capabilityRequirements: {
        features: ["local_logic"],
        minimumCapabilityClass: "baseline",
        evidenceRefs: g.requirementIds.map((requirementId) => ({
          type: "requirement" as const,
          requirementId,
        })),
      },
    }));
    const plan = checked(
      compileTaskPlan({
        phase: {
          phaseId: manifest.phaseId,
          sourcePath: "docs/phase.md",
          sourceFileHash: phaseHash,
          selectionHash: phaseHash,
          lineRange: { start: 1, end: phaseText.match(/[^\n]*\n|[^\n]+$/g)!.length },
          requirements: manifest.requirements.map((r) => ({
            ...r,
            sourceRefs: [{ path: "docs/phase.md", fileHash: phaseHash }],
            phaseCriterionIds: [`${r.requirementId}-phase`],
          })),
          phaseCriteria: manifest.requirements.map((r) => ({
            criterionId: `${r.requirementId}-phase`,
            statement: r.text,
            evidenceKind: "reviewer_evidence" as const,
            checkId: "phase.acceptance",
          })),
        },
        project: {
          rootIdentity: taskByteHash(project),
          baselineCommit: "b".repeat(40),
          baselineTreeHash: manifest.seedRevision,
        },
        policy,
        draft: {
          kind: "task_plan_draft",
          schemaVersion: 1,
          phaseId: manifest.phaseId,
          selectionHash: phaseHash,
          tasks: [...tasks].reverse(),
          dependencies: [
            {
              predecessorTaskId: "domain",
              consumerTaskId: "totals",
              requiredArtifactIds: ["domain-output"],
            },
            {
              predecessorTaskId: "domain",
              consumerTaskId: "presenter",
              requiredArtifactIds: ["domain-output"],
            },
            {
              predecessorTaskId: "totals",
              consumerTaskId: "presenter",
              requiredArtifactIds: ["totals-output"],
            },
          ],
          unresolvedQuestions: [],
        },
      }),
    );
    const adapter = checked(
      await createTaskRunAdapter({ projectRoot: project, stateRoot, authority }),
    );
    const calls: string[] = [],
      reviews: string[] = [];
    const verifier: TaskVerificationAdapter = {
      snapshot: adapter.snapshot,
      verifyDefinitions: async () => ({ success: true, data: true }),
      prepare: async (checkId) => ({
        success: true,
        data: {
          request: {
            command: "/simulated/node",
            args: [checkId],
            cwd: project,
            env: { CI: "1" },
            timeoutMs: 100,
          },
          readEvidence: async () => ({
            success: true,
            data: {
              reportStatus: "valid",
              outputHash: taskContentHash({ simulated: true, checkId }),
              testInventory:
                checkId === "ts.unit"
                  ? {
                      discovered: ["simulated-lifecycle-check"],
                      passed: ["simulated-lifecycle-check"],
                      failed: [],
                      skipped: [],
                      todo: [],
                      focused: false,
                      complete: true,
                    }
                  : null,
            },
          }),
          dispose: async () => ({ success: true, data: true }),
        },
      }),
      review: async (request) => {
        reviews.push(
          `${request.target.type === "task" ? request.target.taskId : "phase"}:${request.checkId}`,
        );
        return { request, approved: true, evidenceArtifactIds: ["simulated-lifecycle-evidence"] };
      },
    };
    const execute = (operation: TaskRunOperation, executor = executeTaskRun, dryRun = false) =>
      executor({
        plan,
        compilationPolicy: policy,
        adapter,
        operation,
        dryRun,
        verification: {
          policy: verificationPolicy,
          adapter: verifier,
          runProcess: async (r) => {
            calls.push(r.args[0]!);
            return { exitCode: 0, stdout: "", stderr: "" };
          },
        },
      });
    const checkpoint = async (operation: TaskRunOperation) => {
      const result = checked(await execute(operation));
      if (result.dryRun) throw new Error("Unexpected preview");
      return result.checkpoint;
    };
    const run = await checkpoint({
      type: "create",
      resourceLimits: {
        maxImplementationAttemptsPerTask: 3,
        maxProviderCalls: 24,
        maxInputTokens: 240000,
        maxOutputTokens: 48000,
        maxWallTimeMs: 1800000,
        maxCostMicrousd: 10000000,
      },
    });
    const runId = run.run.runId;
    const beginOperation = (taskId: string): TaskRunOperation => ({
      type: "begin",
      runId,
      taskId,
      requestedConfiguration: CROSS_CONFIGURATION,
      routingId: manifest.fixtureRevision,
    });
    const complete = async (taskId: string) => {
      const begun = await checkpoint(beginOperation(taskId));
      const target = `src/${taskId}.ts`;
      const before = await readFile(path.join(project, target), "utf8"),
        after = await readFile(
          path.join(fixtureRoot, manifest.fixtureId, "reference", target),
          "utf8",
        );
      if (before === after) await checkpoint({ type: "no_change", runId });
      else {
        const attempt = begun.run.attempts.at(-1)!;
        const payload = {
          kind: "change_set" as const,
          schemaVersion: 1 as const,
          planId: plan.planId,
          taskId,
          attemptId: attempt.attemptId,
          inputRevision: attempt.inputRevision,
          changes: [
            {
              type: "replace_text" as const,
              path: target,
              expectedFileHash: taskByteHash(before),
              oldText: before,
              newText: after,
            },
          ],
        };
        await checkpoint({
          type: "apply",
          runId,
          proposal: { ...payload, changeSetId: taskContentHash(payload) },
        });
      }
      return checkpoint({ type: "verify", runId, taskId });
    };
    return {
      project,
      stateRoot,
      manifest,
      plan,
      policy,
      adapter,
      execute,
      checkpoint,
      runId,
      beginOperation,
      complete,
      calls,
      reviews,
      dispose: () => rm(outer, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(outer, { recursive: true, force: true });
    throw error;
  }
}
