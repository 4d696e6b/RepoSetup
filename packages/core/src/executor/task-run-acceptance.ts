import { taskFailure, type TaskParseResult } from "../tasks/parse.js";
import { taskContentHash } from "../tasks/canonical.js";
import type { TaskRunCheckpoint } from "../tasks/checkpoint.js";
import type { TaskPlan } from "../tasks/plan-schema.js";
import type { TaskCompilationPolicy } from "../tasks/compile.js";
import type { TaskVerificationPolicy } from "../tasks/verification-policy.js";
import { executeTaskVerification, type TaskVerificationAdapter } from "./task-verification.js";
import type { TaskRunAdapter, TaskRunSave, TaskRunAcceptanceReceipt } from "./task-run-types.js";
import type { ProcessRunner } from "./types.js";

/** Fresh executor evidence, original input and owned postimages precede a durable acceptance commit. */
export async function verifyTaskRunAttempt({
  checkpoint: c,
  plan,
  taskId,
  adapter,
  compilationPolicy,
  verification,
  bindingCurrent,
  operationSignal,
  receipts,
  save,
}: {
  checkpoint: TaskRunCheckpoint;
  plan: TaskPlan;
  taskId: string;
  adapter: TaskRunAdapter;
  compilationPolicy: TaskCompilationPolicy;
  verification: {
    policy: TaskVerificationPolicy;
    adapter: TaskVerificationAdapter;
    runProcess: ProcessRunner;
  };
  bindingCurrent(attemptId: string): Promise<TaskParseResult<true>>;
  operationSignal: AbortSignal | undefined;
  receipts: Map<string, TaskRunAcceptanceReceipt>;
  save: TaskRunSave;
}): Promise<TaskParseResult<true>> {
  const state = c.run.tasks.find((t) => t.taskId === taskId);
  const a = c.run.attempts.find((a) => a.attemptId === state?.attemptIds.at(-1));
  if (
    !state ||
    !a ||
    a.application.status !== "applied" ||
    !["verifying", "accepted"].includes(a.status)
  )
    return taskFailure(
      "TASK_STATE_CONFLICT",
      "Task lacks a fully recorded reconciled application/no-change outcome.",
    );
  const fresh = await bindingCurrent(a.attemptId);
  if (!fresh.success) return fresh;
  const current = await adapter.snapshot();
  if (!current.success) return current;
  a.status = "verifying";
  c.run.activeAttemptId = a.attemptId;
  c.bindings.find((b) => b.attemptId === a.attemptId)!.verificationPending = true;
  state.status = "verifying";
  let stored = await save("transition", taskId);
  if (!stored.success) return stored;
  const checked = await executeTaskVerification({
    plan,
    compilationPolicy: compilationPolicy,
    ...verification,
    runId: c.run.runId,
    target: { type: "task", taskId },
    inputRevision: a.inputRevision,
    expectedRevision: current.data.revision,
    ...(operationSignal ? { signal: operationSignal } : {}),
  });
  if (!checked.success) return checked;
  if (checked.data.dryRun)
    return taskFailure("TASK_CHECK_BLOCKED", "Dry-run evidence cannot accept work.");
  const v = checked.data.verification;
  const after = await adapter.snapshot();
  const inputs = await bindingCurrent(a.attemptId);
  if (!after.success || after.data.revision !== v.checkedRevision || !inputs.success)
    return taskFailure(
      "TASK_VERIFICATION_STALE",
      "Original input/postimages changed during verification.",
    );
  const attempt = c.run.attempts.find((x) => x.attemptId === a.attemptId)!;
  const s = c.run.tasks.find((t) => t.taskId === taskId)!;
  attempt.verification = v;
  attempt.finishedAt = new Date().toISOString();
  attempt.usage.durationMs += v.durationMs;
  c.bindings.find((b) => b.attemptId === a.attemptId)!.verificationPending = false;
  c.run.project.latestProjectRevision = v.checkedRevision;
  s.status =
    v.outcome === "pass"
      ? "accepted"
      : v.outcome === "fail"
        ? "needs_repair"
        : v.outcome === "needs_review"
          ? "needs_review"
          : "blocked";
  attempt.status =
    v.outcome === "pass"
      ? "accepted"
      : v.outcome === "fail"
        ? "failed"
        : s.status === "needs_review"
          ? "needs_review"
          : "blocked";
  s.acceptedVerificationId = v.outcome === "pass" ? v.verificationId : null;
  s.reasonCode =
    v.outcome === "pass" ? null : v.outcome === "fail" ? "TASK_CHECK_FAILED" : "TASK_NEEDS_REVIEW";
  c.run.activeAttemptId = null;
  c.run.status =
    v.outcome === "pass" ? "active" : v.outcome === "needs_review" ? "needs_review" : "blocked";
  c.run.acceptedArtifacts = c.run.acceptedArtifacts.filter((a) => a.producerTaskId !== taskId);
  if (v.outcome === "pass") {
    const task = plan.tasks.find((t) => t.taskId === taskId)!;
    for (const output of task.outputs) {
      const paths = [];
      for (const path of output.paths) {
        const read = await adapter.repository.read(path);
        if (!read.success) return read;
        if (!read.data) return taskFailure("TASK_ARTIFACT_INVALID", "Declared output is absent.");
        paths.push({ path, fileHash: read.data.fileHash });
      }
      c.run.acceptedArtifacts.push({
        producerTaskId: taskId,
        artifactId: output.artifactId,
        attemptId: attempt.attemptId,
        acceptanceRevision: taskContentHash({
          planId: plan.planId,
          attemptId: attempt.attemptId,
          artifactId: output.artifactId,
          inputRevision: attempt.inputRevision,
          paths,
        }),
        verificationId: v.verificationId,
        paths,
      });
    }
  }
  const finalSnapshot = await adapter.snapshot();
  if (
    !finalSnapshot.success ||
    finalSnapshot.data.revision !== v.checkedRevision ||
    !(await bindingCurrent(a.attemptId)).success
  )
    return taskFailure(
      "TASK_VERIFICATION_STALE",
      "Acceptance inputs changed before the durable commit.",
    );
  if (operationSignal?.aborted)
    return taskFailure("TASK_BUDGET_EXHAUSTED", "Cancelled or exhausted work cannot be accepted.");
  stored = await save("verification", taskId, s.reasonCode ?? undefined);
  if (!stored.success) {
    receipts.delete(taskId);
    return stored;
  }
  if (v.outcome === "pass")
    receipts.set(taskId, {
      verification: v,
      bindingHash: taskContentHash(c.bindings.find((b) => b.attemptId === a.attemptId)),
      artifactHash: taskContentHash(
        c.run.acceptedArtifacts.filter((a) => a.producerTaskId === taskId),
      ),
    });
  else receipts.delete(taskId);
  return { success: true, data: true };
}
