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
import { taskRepairAction } from "../tasks/failure.js";
import { taskRemainingAllowance } from "../tasks/routing.js";

export type TaskManagedPhaseResult =
  | { success: true; checkpoint: TaskRunCheckpoint }
  | { success: false; error: RepoSetupError; runId: string | null };

/** Fixed Git probes and serial lifecycle belong to the executor. No task/model/config command is used. */
export async function executeManagedTaskPhase(input: {
  plan: unknown;
  compilationPolicy: TaskCompilationPolicy;
  resourceLimits: unknown;
  managedCompilationId?: string;
  initialDurationMs?: number;
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
  allowRepair?: boolean;
  signal?: AbortSignal;
}): Promise<TaskManagedPhaseResult> {
  const started = performance.now();
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
  if (!Number.isSafeInteger(input.initialDurationMs ?? 0) || (input.initialDurationMs ?? 0) < 0)
    return fail(
      taskFailure("TASK_PREFERENCES_INVALID", "Managed startup duration is invalid.").error,
    );
  if ((input.initialDurationMs ?? 0) >= limits.data.maxWallTimeMs)
    return fail(
      taskFailure("TASK_BUDGET_EXHAUSTED", "Managed startup exhausted the phase allowance.").error,
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
    initialDurationMs:
      (input.initialDurationMs ?? 0) + Math.max(0, Math.ceil(performance.now() - started)),
    ...(input.managedCompilationId ? { managedCompilationId: input.managedCompilationId } : {}),
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
    let outputTokens = input.allowRepair
      ? Math.min(4096, input.maxOutputTokens)
      : input.maxOutputTokens;
    for (;;) {
      const remaining = taskRemainingAllowance(checkpoint.run);
      if (
        remaining.calls < 1 ||
        remaining.outputTokens < outputTokens ||
        remaining.costMicrousd === 0 ||
        remaining.wallTimeMs === 0
      ) {
        const stopped = await execute({
          type: "stop",
          runId,
          taskId,
          code: "TASK_BUDGET_EXHAUSTED",
        });
        return fail(
          stopped.success
            ? taskFailure(
                "TASK_BUDGET_EXHAUSTED",
                "Retained reservations exhaust the next implementation request allowance.",
              ).error
            : stopped.error,
        );
      }
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
          maxOutputTokens: outputTokens,
          timeoutMs: input.timeoutMs,
          ...(input.allowRepair ? { allowRepair: true } : {}),
        },
        { type: "verify" as const, runId, taskId },
      ]) {
        if (
          operation.type === "verify" &&
          checkpoint.run.tasks.find((t) => t.taskId === taskId)?.status === "needs_repair"
        )
          break;
        const result = await execute(operation);
        if (!result.success) return fail(result.error);
        if (result.data.dryRun)
          return fail(
            taskFailure("TASK_STATE_CONFLICT", "Managed operations require live executor state.")
              .error,
          );
        checkpoint = result.data.checkpoint;
        if (
          checkpoint.run.status !== "active" &&
          !(
            input.allowRepair &&
            checkpoint.run.status === "blocked" &&
            checkpoint.run.tasks.find((t) => t.taskId === taskId)?.status === "needs_repair"
          )
        )
          return fail(
            taskFailure(
              checkpoint.run.status === "failed"
                ? "TASK_ATTEMPT_LIMIT_EXCEEDED"
                : "TASK_NEEDS_REVIEW",
              "Managed execution stopped; inspect durable run state.",
            ).error,
          );
      }
      const taskState = checkpoint.run.tasks.find((t) => t.taskId === taskId)!;
      if (taskState.status === "accepted") break;
      const attempt = checkpoint.run.attempts.find(
        (a) => a.attemptId === taskState.attemptIds.at(-1),
      )!;
      const action = taskRepairAction(attempt);
      if (!input.allowRepair || taskState.status !== "needs_repair" || !action)
        return fail(
          taskFailure(
            "TASK_CHECK_FAILED",
            "Current task was not accepted or its failure is ineligible for the reviewed repair policy.",
          ).error,
        );
      if (attempt.attemptNumber >= limits.data.maxImplementationAttemptsPerTask)
        return fail(
          taskFailure(
            "TASK_ATTEMPT_LIMIT_EXCEEDED",
            "At most three implementation attempts are permitted.",
          ).error,
        );
      if (action === "increase_output") {
        const larger = Math.min(input.maxOutputTokens, outputTokens * 2);
        if (larger <= outputTokens) {
          const stopped = await execute({
            type: "stop",
            runId,
            taskId,
            code: "TASK_OUTPUT_INCOMPLETE",
          });
          if (!stopped.success) return fail(stopped.error);
          return fail(
            taskFailure(
              "TASK_OUTPUT_INCOMPLETE",
              "The reviewed per-call output ceiling has no room for an increase; no more expensive model is selected.",
            ).error,
          );
        }
        outputTokens = larger;
      }
    }
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
