import path from "node:path";
import { executeTaskRun } from "./task-run.js";
import type { TaskRunAdapter } from "./task-run-types.js";
import type { TaskProviderAdapter } from "../tasks/provider.js";
import type { TaskVerificationAdapter } from "./task-verification.js";
import type { TaskVerificationPolicy } from "../tasks/verification-policy.js";
import type { TaskCompilationPolicy } from "../tasks/compile.js";
import { validateTaskPlan } from "../tasks/compile.js";
import { taskContentHash } from "../tasks/canonical.js";
import { taskResourceLimitsSchema } from "../tasks/primitives.js";
import { taskFailure } from "../tasks/parse.js";
import type { TaskRunCheckpoint } from "../tasks/checkpoint.js";
import type { ProcessRunner } from "./types.js";
import type { RepoSetupError } from "../errors/model.js";

export type TaskManagedPhaseResult =
  | { success: true; checkpoint: TaskRunCheckpoint }
  | { success: false; error: RepoSetupError; runId: string | null };

/** Fixed Git probes and serial lifecycle belong to the executor. No task/model/config command is used. */
export async function executeManagedTaskPhase(input: {
  plan: unknown;
  compilationPolicy: TaskCompilationPolicy;
  resourceLimits: unknown;
  projectRoot: string;
  gitExecutable: string;
  adapter: TaskRunAdapter;
  provider: TaskProviderAdapter;
  verification: {
    policy: TaskVerificationPolicy;
    adapter: TaskVerificationAdapter;
    runProcess: ProcessRunner;
  };
  allowProviderUsage: boolean;
  maxOutputTokens: number;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<TaskManagedPhaseResult> {
  let runId: string | null = null;
  const fail = (error: RepoSetupError): TaskManagedPhaseResult => ({
    success: false,
    error,
    runId,
  });
  const plan = validateTaskPlan(input.plan, input.compilationPolicy);
  if (!plan.success) return fail(plan.error);
  const limits = taskResourceLimitsSchema.safeParse(input.resourceLimits);
  if (!limits.success)
    return fail(
      taskFailure("TASK_PREFERENCES_INVALID", "Finite managed resource limits are required.").error,
    );
  if (!input.allowProviderUsage)
    return fail(
      taskFailure(
        "TASK_PROVIDER_ALLOWANCE_REQUIRED",
        "Explicit provider usage allowance is required.",
      ).error,
    );
  if (!path.isAbsolute(input.gitExecutable) || !path.isAbsolute(input.projectRoot))
    return fail(
      taskFailure("TASK_PREREQUISITE_MISSING", "Canonical Git/project paths are required.").error,
    );
  if (input.signal?.aborted)
    return fail(
      taskFailure("TASK_EXECUTION_ABORTED", "Managed run cancelled before probes.").error,
    );
  const args = [
    "--no-optional-locks",
    "-c",
    "core.fsmonitor=false",
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "core.untrackedCache=false",
  ];
  const probe = async (command: string[]) =>
    input.verification.runProcess({
      command: input.gitExecutable,
      args: [...args, ...command],
      cwd: input.projectRoot,
      env: {
        PATH: path.dirname(input.gitExecutable),
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_TERMINAL_PROMPT: "0",
      },
      timeoutMs: 10000,
      ...(input.signal ? { signal: input.signal } : {}),
    });
  try {
    const root = await probe(["rev-parse", "--show-toplevel"]);
    const commit = await probe(["rev-parse", "--verify", "HEAD"]);
    const status = await probe(["status", "--porcelain=v1", "--untracked-files=all"]);
    if (
      [root, commit, status].some(
        (r) =>
          r.exitCode !== 0 ||
          r.timedOut ||
          r.outputTruncated ||
          r.aborted ||
          Buffer.byteLength(r.stdout) > 65536,
      ) ||
      root.stdout.trim() !== input.projectRoot ||
      commit.stdout.trim() !== plan.data.project.baselineCommit ||
      status.stdout !== ""
    )
      return fail(
        taskFailure(
          "TASK_PROJECT_DRIFT",
          "Managed execution requires the reviewed Git root/commit and a clean tracked/untracked baseline.",
        ).error,
      );
  } catch {
    return fail(
      taskFailure("TASK_PREREQUISITE_MISSING", "Fixed Git baseline probes could not complete.")
        .error,
    );
  }
  const snapshot = await input.adapter.snapshot();
  if (!snapshot.success) return fail(snapshot.error);
  if (taskContentHash(snapshot.data.entries) !== plan.data.project.baselineTreeHash)
    return fail(
      taskFailure(
        "TASK_PROJECT_DRIFT",
        "Reviewed baseline inventory differs from current project bytes/metadata.",
      ).error,
    );
  const checks = await input.verification.adapter.verifyDefinitions();
  if (!checks.success) return fail(checks.error);
  const execute = (operation: Parameters<typeof executeTaskRun>[0]["operation"]) =>
    executeTaskRun({
      plan: plan.data,
      compilationPolicy: input.compilationPolicy,
      operation,
      adapter: input.adapter,
      provider: input.provider,
      verification: input.verification,
      ...(input.signal ? { signal: input.signal } : {}),
    });
  const created = await execute({
    type: "create",
    resourceLimits: limits.data,
    expectedBaselineTreeHash: plan.data.project.baselineTreeHash,
  });
  if (!created.success) return fail(created.error);
  if (created.data.dryRun)
    return fail(
      taskFailure("TASK_STATE_CONFLICT", "Managed runs cannot use advisory dry-run receipts.")
        .error,
    );
  let checkpoint = created.data.checkpoint;
  runId = checkpoint.run.runId;
  for (const taskId of plan.data.orderedTaskIds) {
    for (const operation of [
      {
        type: "begin" as const,
        runId,
        taskId,
        requestedConfiguration: input.provider.configuration,
        routingId: taskContentHash({
          selection: "explicit",
          planId: plan.data.planId,
          taskId,
          configuration: input.provider.configuration,
        }),
      },
      {
        type: "request" as const,
        runId,
        allowProviderUsage: true as const,
        maxOutputTokens: input.maxOutputTokens,
        timeoutMs: input.timeoutMs,
      },
      { type: "verify" as const, runId, taskId },
    ]) {
      const result = await execute(operation);
      if (!result.success) return fail(result.error);
      if (result.data.dryRun)
        return fail(
          taskFailure("TASK_STATE_CONFLICT", "Managed operations require live executor state.")
            .error,
        );
      checkpoint = result.data.checkpoint;
      if (checkpoint.run.status !== "active")
        return fail(
          taskFailure("TASK_NEEDS_REVIEW", "Managed execution stopped; inspect durable run state.")
            .error,
        );
    }
    if (checkpoint.run.tasks.find((t) => t.taskId === taskId)?.status !== "accepted")
      return fail(
        taskFailure(
          "TASK_CHECK_FAILED",
          "Current task was not independently accepted; no automatic repair or escalation occurs.",
        ).error,
      );
  }
  const finalized = await execute({ type: "finalize", runId });
  if (!finalized.success) return fail(finalized.error);
  if (finalized.data.dryRun || finalized.data.checkpoint.run.status !== "succeeded")
    return fail(
      taskFailure(
        "TASK_PHASE_ACCEPTANCE_FAILED",
        "Final independent phase acceptance did not pass.",
      ).error,
    );
  return { success: true, checkpoint: finalized.data.checkpoint };
}
