import type { TaskRunCheckpoint } from "../tasks/checkpoint.js";
import type { TaskParseResult } from "../tasks/parse.js";
import { auditTaskApplication } from "../tasks/application.js";
import type { TaskRunAdapter, TaskRunLease, TaskRunSave } from "./task-run-types.js";

/** Observe intents without replay, adoption of uncertain writes or rollback. */
export async function reconcileTaskRun({
  checkpoint: c,
  adapter,
  lease,
  bindingCurrent,
  reviewed,
  save,
}: {
  checkpoint: TaskRunCheckpoint;
  adapter: TaskRunAdapter;
  lease: TaskRunLease;
  bindingCurrent(attemptId: string): Promise<TaskParseResult<true>>;
  reviewed: boolean;
  save: TaskRunSave;
}): Promise<TaskParseResult<true>> {
  // A killed verification has unknown elapsed allowance; it cannot reset the phase budget.
  let uncertain =
    c.phaseVerificationPending ||
    c.bindings.some((b) => b.verificationPending) ||
    (c.providerCalls ?? []).some(
      (call) =>
        call.status === "pending" ||
        call.usage?.inputTokens.provenance === "unknown" ||
        call.usage?.outputTokens.provenance === "unknown" ||
        call.usage?.costMicrousd.provenance === "unknown",
    );
  const latest = new Map(c.journal.map((e) => [e.path, e.sequence]));
  for (const e of c.journal) {
    if (latest.get(e.path) !== e.sequence && e.status !== "unknown") continue;
    if (e.type === "directory") {
      const observed = await adapter.inspectDirectory(e.path);
      e.observation = observed.success
        ? { type: observed.data === "absent" ? "absent" : "directory" }
        : { type: "unavailable" };
      if (!observed.success || (e.status === "applied" && observed.data !== "present")) {
        if (e.status !== "applied") e.status = "unknown";
        uncertain = true;
      } else if (e.status === "pending") {
        e.status = observed.data === "absent" ? "not_applied" : "unknown";
        uncertain ||= e.status === "unknown";
      }
    } else {
      const observed = await adapter.repository.read(e.path);
      e.observation = observed.success
        ? observed.data
          ? { type: "file", fileHash: observed.data.fileHash }
          : { type: "absent" }
        : { type: "unavailable" };
      const staged = await lease.inspectStage(e.stagingId!, e.afterHash);
      if (!observed.success || !staged.success) {
        if (e.status !== "applied") e.status = "unknown";
        uncertain = true;
        continue;
      }
      const hash = observed.data?.fileHash ?? null;
      if (e.status === "applied" && (hash !== e.afterHash || staged.data !== "absent")) {
        uncertain = true;
      } else if (e.status === "pending") {
        e.status = hash === e.beforeHash ? "not_applied" : "unknown";
        uncertain ||= e.status === "unknown";
      }
    }
    uncertain ||= e.status === "unknown";
  }
  const active =
    c.run.attempts.find((a) => a.attemptId === c.run.activeAttemptId) ??
    c.run.attempts.find((a) =>
      c.bindings.some((b) => b.attemptId === a.attemptId && b.verificationPending),
    );
  if (active) {
    const b = c.bindings.find((b) => b.attemptId === active.attemptId)!;
    const entries = c.journal.filter((e) => e.attemptId === active.attemptId);
    const applied = entries.filter((e) => e.type === "file" && e.status === "applied");
    b.postimages = applied.map((e) => ({ path: e.path, fileHash: e.afterHash }));
    active.application.effects = applied.map((e) => ({
      path: e.path,
      beforeHash: e.beforeHash,
      afterHash: e.afterHash,
      changeIndex: e.changeIndex,
      sequence: e.sequence,
    }));
    const current = await bindingCurrent(active.attemptId);
    const fresh = await adapter.snapshot();
    const audit =
      fresh.success &&
      auditTaskApplication(
        b.beforeSnapshot,
        fresh.data,
        applied.map((e) => e.path),
        entries.filter((e) => e.type === "directory" && e.status === "applied").map((e) => e.path),
      );
    uncertain ||= !current.success || !audit || !audit.success;
    if (fresh.success) c.run.project.latestProjectRevision = fresh.data.revision;
    // A user-reviewed exact completed batch may be freshly verified, never reapplied.
    const completed = entries.length > 0 && entries.every((e) => e.status === "applied");
    if (reviewed && !uncertain && (completed || active.application.status === "applied")) {
      b.verificationPending = false;
      c.run.activeAttemptId = active.attemptId;
      active.status = "verifying";
      active.application.status = "applied";
      active.application.failureCode = null;
      active.application.resultingProjectRevision = c.run.project.latestProjectRevision;
      c.run.tasks.find((t) => t.taskId === active.taskId)!.status = "verifying";
      c.run.status = "active";
    } else {
      active.status = "needs_review";
      active.application.status = applied.length ? "partially_applied" : "not_applied";
      active.application.failureCode = "TASK_EXECUTION_INTERRUPTED";
      c.run.tasks.find((t) => t.taskId === active.taskId)!.status = "needs_review";
      c.run.status = "needs_review";
      if (reviewed && !uncertain) {
        c.run.activeAttemptId = null;
        c.run.tasks.find((t) => t.taskId === active.taskId)!.status = "blocked";
        c.run.status = "blocked";
      }
    }
  } else c.run.status = uncertain ? "needs_review" : "blocked";
  if (reviewed && !uncertain) {
    c.phaseVerificationPending = false;
    for (const t of c.run.tasks)
      if (t.status === "invalidated") {
        t.status = "queued";
        t.reasonCode = null;
      }
  }
  const observedProject = await adapter.snapshot();
  const recorded = c.journal.filter((e) => e.status === "applied");
  if (
    !observedProject.success ||
    !auditTaskApplication(
      c.baselineSnapshot,
      observedProject.data,
      recorded.filter((e) => e.type === "file").map((e) => e.path),
      recorded.filter((e) => e.type === "directory").map((e) => e.path),
    ).success
  ) {
    c.run.status = "needs_review";
    if (active) {
      active.status = "needs_review";
      c.run.tasks.find((t) => t.taskId === active.taskId)!.status = "needs_review";
    }
  }
  c.run.project.lastReconciledRevision = c.run.project.latestProjectRevision;
  const stored = await save(
    "reconciliation",
    active?.taskId,
    uncertain ? "TASK_NEEDS_REVIEW" : undefined,
  );
  return stored;
}
