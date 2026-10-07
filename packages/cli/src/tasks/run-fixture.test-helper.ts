import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
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
  type TaskVerificationPolicy,
  type TaskVerificationAdapter,
  type TaskRunCheckpoint,
  type TaskRunOperation,
  type TaskRunAdapter,
} from "@reposetup/core";
import { createTaskRunAdapter } from "./application-adapter.js";
export const HASH = `sha256:${"a".repeat(64)}`;
export const LIMITS = {
  maxImplementationAttemptsPerTask: 3,
  maxProviderCalls: 24,
  maxInputTokens: 240000,
  maxOutputTokens: 48000,
  maxWallTimeMs: 1800000,
  maxCostMicrousd: 10000000,
};
export const CONFIGURATION = {
  adapterId: "openai-responses-v1",
  providerId: "openai-responses-v1" as const,
  modelProfileId: "qualified-strong",
  nativeEffortId: "low",
};
export async function runFixture() {
  const outer = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-f-")));
  try {
    const root = path.join(outer, "project"),
      stateRoot = path.join(outer, "state");
    await mkdir(root);
    await mkdir(stateRoot, { mode: 0o700 });
    await mkdir(path.join(root, "src"));
    await mkdir(path.join(root, "docs"));
    const phaseText = "# Phase\nRequirements.\n";
    await writeFile(path.join(root, "docs/phase.md"), phaseText);
    await writeFile(path.join(root, "src/a.ts"), "export const a = 1;\r\n");
    const makeTask = (taskId: string, requirementId: string, write: string[]): Task => ({
      taskId,
      objective: `Implement ${taskId}`,
      kind: "implementation",
      requirementIds: [requirementId],
      constraints: ["Keep behavior."],
      scope: {
        read: [
          { type: "subtree", path: "src" },
          { type: "subtree", path: "docs" },
        ],
        write,
        deny: [],
      },
      criteria: [
        {
          criterionId: `${taskId}-criterion`,
          statement: "Independent check",
          requirementIds: [requirementId],
          evidenceKind: "trusted_check",
          checkIds: ["ts.unit", "task.acceptance"],
        },
      ],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      outputs: [
        {
          artifactId: `${taskId}-output`,
          kind: "file_snapshot",
          paths: write,
          criterionIds: [`${taskId}-criterion`],
        },
      ],
      capabilityRequirements: {
        features: ["local_logic"],
        minimumCapabilityClass: "baseline",
        evidenceRefs: [{ type: "requirement", requirementId }],
      },
    });
    const definitions: TaskVerificationPolicy["definitions"] = TASK_CHECK_IDS.map((checkId) => ({
      checkId,
      definitionRevision: HASH,
      authority: checkId.endsWith("acceptance") ? "reviewer" : "executor",
      criterionIds: ["producer-criterion", "consumer-criterion", "req-one-phase", "req-two-phase"],
      requiredTestIds: checkId === "ts.unit" ? ["independent-test"] : [],
      evidenceArtifactIds: ["independent-evidence"],
    }));
    const verificationPolicy: TaskVerificationPolicy = {
      schemaVersion: 1,
      definitions,
      catalogRevision: taskVerificationCatalogHash(definitions),
    };
    const phase = {
      phaseId: "phase-one",
      sourcePath: "docs/phase.md",
      sourceFileHash: taskByteHash(phaseText),
      lineRange: { start: 1, end: 2 },
      selectionHash: taskByteHash(phaseText),
      requirements: ["req-one", "req-two"].map((requirementId) => ({
        requirementId,
        text: `Requirement ${requirementId}`,
        sourceRefs: [{ path: "docs/phase.md", fileHash: taskByteHash(phaseText) }],
        phaseCriterionIds: [`${requirementId}-phase`],
      })),
      phaseCriteria: ["req-one", "req-two"].map((id) => ({
        criterionId: `${id}-phase`,
        statement: "Independent phase acceptance",
        evidenceKind: "trusted_check" as const,
        checkId: "phase.acceptance",
      })),
    };
    const write = ["src/a.ts", "src/new/b.ts", "src/c.ts"];
    const policy = {
      supportProfileId: "managed-ts-node-v1" as const,
      supportProfileRevision: 1,
      checkCatalogRevision: verificationPolicy.catalogRevision,
      checkIds: [...TASK_CHECK_IDS],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      authority: {
        read: [
          { type: "subtree" as const, path: "src" },
          { type: "subtree" as const, path: "docs" },
        ],
        write,
        deny: [],
      },
      caseSensitivePaths: true,
    };
    const result = compileTaskPlan({
      phase,
      project: {
        rootIdentity: taskByteHash(root),
        baselineCommit: "b".repeat(40),
        baselineTreeHash: HASH,
      },
      policy,
      draft: {
        kind: "task_plan_draft",
        schemaVersion: 1,
        phaseId: phase.phaseId,
        selectionHash: phase.selectionHash,
        tasks: [
          makeTask("producer", "req-one", write.slice(0, 2)),
          makeTask("consumer", "req-two", [write[2]!]),
        ],
        dependencies: [
          {
            predecessorTaskId: "producer",
            consumerTaskId: "consumer",
            requiredArtifactIds: ["producer-output"],
          },
        ],
        unresolvedQuestions: [],
      },
    });
    if (!result.success) throw new Error(result.error.message);
    const plan = result.data;
    const ports = await createTaskRunAdapter({
      projectRoot: root,
      stateRoot,
      authority: policy.authority,
    });
    if (!ports.success) throw new Error(ports.error.message);
    let adapter: TaskRunAdapter = ports.data;
    let approved = true,
      exitCode = 0;
    const reviews: string[] = [];
    let immutableProjectPaths: readonly string[] = [];
    const verifier: TaskVerificationAdapter = {
      get immutableProjectPaths() {
        return immutableProjectPaths;
      },
      snapshot: () => adapter.snapshot(),
      verifyDefinitions: async () => ({ success: true, data: true }),
      prepare: async (checkId) => ({
        success: true,
        data: {
          request: {
            command: "/qualified/node",
            args: [checkId],
            cwd: root,
            env: { CI: "1" },
            timeoutMs: 100,
          },
          readEvidence: async () => ({
            success: true,
            data: {
              reportStatus: "valid",
              outputHash: HASH,
              testInventory:
                checkId === "ts.unit"
                  ? {
                      discovered: ["independent-test"],
                      passed: exitCode === 0 ? ["independent-test"] : [],
                      failed: exitCode ? ["independent-test"] : [],
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
        reviews.push(request.checkId);
        return { request, approved, evidenceArtifactIds: ["independent-evidence"] };
      },
    };
    const execute = (
      operation: TaskRunOperation,
      options: Partial<Parameters<typeof executeTaskRun>[0]> = {},
    ) =>
      executeTaskRun({
        plan,
        compilationPolicy: policy,
        adapter,
        operation,
        verification: {
          policy: verificationPolicy,
          adapter: verifier,
          runProcess: async () => ({ exitCode, stdout: "", stderr: "" }),
        },
        ...options,
      });
    const requireRun = async (
      operation: TaskRunOperation,
      options: Partial<Parameters<typeof executeTaskRun>[0]> = {},
    ): Promise<TaskRunCheckpoint> => {
      const r = await execute(operation, options);
      if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
      if (r.data.dryRun) throw new Error("unexpected dry run");
      return r.data.checkpoint;
    };
    const create = () => requireRun({ type: "create", resourceLimits: LIMITS });
    const begin = (runId: string, taskId = "producer") =>
      requireRun({
        type: "begin",
        runId,
        taskId,
        requestedConfiguration: CONFIGURATION,
        routingId: HASH,
      });
    const proposal = (c: TaskRunCheckpoint, changes: unknown[]) => {
      const a = c.run.attempts.at(-1)!;
      const value = {
        kind: "change_set",
        schemaVersion: 1,
        planId: plan.planId,
        taskId: a.taskId,
        attemptId: a.attemptId,
        inputRevision: a.inputRevision,
        changes,
      };
      return { ...value, changeSetId: taskContentHash(value) };
    };
    const producerChanges = [
      {
        type: "replace_text",
        path: "src/a.ts",
        expectedFileHash: taskByteHash("export const a = 1;\r\n"),
        oldText: "1",
        newText: "2",
      },
      {
        type: "create_text",
        path: "src/new/b.ts",
        expectedState: "absent",
        content: "export const b = 2;\n",
      },
    ];
    return {
      root,
      stateRoot,
      plan,
      policy,
      execute,
      requireRun,
      create,
      begin,
      proposal,
      producerChanges,
      reviews,
      get adapter() {
        return adapter;
      },
      set adapter(value: TaskRunAdapter) {
        adapter = value;
      },
      set immutablePaths(value: readonly string[]) {
        immutableProjectPaths = value;
      },
      set approved(value: boolean) {
        approved = value;
      },
      set exitCode(value: number) {
        exitCode = value;
      },
      cleanup: () => rm(outer, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(outer, { recursive: true, force: true });
    throw error;
  }
}
