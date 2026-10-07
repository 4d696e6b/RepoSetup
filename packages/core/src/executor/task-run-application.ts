import { randomUUID } from "node:crypto";
import {
  prepareTaskTextChanges,
  auditTaskApplication,
  type TaskPreparedTextChange,
} from "../tasks/application.js";
import { taskContentHash } from "../tasks/canonical.js";
import { taskFailure, type TaskParseResult } from "../tasks/parse.js";
import type { TaskRunCheckpoint } from "../tasks/checkpoint.js";
import type { TaskPlan } from "../tasks/plan-schema.js";
import type { TaskVerifierSnapshot } from "../tasks/verifier-files.js";
import type { TaskErrorCode } from "../tasks/errors.js";
import type { TaskRunAdapter, TaskRunLease, TaskRunSave } from "./task-run-types.js";

/** Entire batch is preflighted and journaled before individual guarded effects. */
export async function applyTaskRunProposal({
  checkpoint: c,
  plan,
  op,
  adapter,
  lease,
  bindingCurrent,
  operationSignal,
  snapshot,
  save,
}: {
  checkpoint: TaskRunCheckpoint;
  plan: TaskPlan;
  op: { type: "apply"; proposal: unknown } | { type: "no_change" };
  adapter: TaskRunAdapter;
  lease: TaskRunLease;
  snapshot: TaskVerifierSnapshot;
  operationSignal: AbortSignal | undefined;
  bindingCurrent(attemptId: string): Promise<TaskParseResult<true>>;
  save: TaskRunSave;
}): Promise<TaskParseResult<true>> {
  const attempt = c.run.attempts.find((a) => a.attemptId === c.run.activeAttemptId);
  if (!attempt || !["prepared", "proposal_received"].includes(attempt.status))
    return taskFailure("TASK_STATE_CONFLICT", "Proposal needs a durably opened unapplied attempt.");
  const task = plan.tasks.find((t) => t.taskId === attempt.taskId)!;
  const binding = c.bindings.find((b) => b.attemptId === attempt.attemptId)!;
  const fresh = await bindingCurrent(attempt.attemptId);
  if (!fresh.success) return fresh;
  if (snapshot.revision !== binding.beforeSnapshot.revision)
    return taskFailure("TASK_PROJECT_DRIFT", "Project changed since attempt preparation.");
  let changes: TaskPreparedTextChange[] = [];
  let directories: string[] = [];
  if (op.type === "apply") {
    const preimages = [];
    for (const target of binding.writeTargets) {
      const read = await adapter.repository.read(target.path);
      if (!read.success) return read;
      preimages.push({ path: target.path, text: read.data?.text ?? null });
    }
    const prepared = prepareTaskTextChanges({
      proposal: op.proposal,
      planId: plan.planId,
      attemptId: attempt.attemptId,
      task,
      packet: binding,
      preimages,
    });
    if (!prepared.success) return prepared;
    changes = prepared.data;
    const preflight = await adapter.preflight(changes);
    if (!preflight.success) return preflight;
    directories = preflight.data;
  }
  attempt.status = "applying";
  attempt.proposalOutcome = op.type === "apply" ? "change_set" : "no_change";
  const entries: TaskRunCheckpoint["journal"] = [];
  for (const path of directories)
    entries.push({
      sequence: c.journal.length + entries.length + 1,
      attemptId: attempt.attemptId,
      changeIndex: 0,
      type: "directory",
      path,
      beforeHash: null,
      afterHash: taskContentHash({ type: "directory", path }),
      stagingId: null,
      status: "pending",
      observation: null,
    });
  for (const change of changes)
    entries.push({
      sequence: c.journal.length + entries.length + 1,
      attemptId: attempt.attemptId,
      changeIndex: change.changeIndex,
      type: "file",
      path: change.path,
      beforeHash: change.beforeHash,
      afterHash: change.afterHash,
      stagingId: randomUUID(),
      status: "pending",
      observation: null,
    });
  c.journal.push(...entries);
  let stored = await save("transition", task.taskId);
  if (!stored.success) return stored;
  let failure: TaskErrorCode | null = null;
  for (const planned of entries) {
    if (operationSignal?.aborted) {
      failure = "TASK_EXECUTION_ABORTED";
      break;
    }
    // Persisted copies are intentionally used after every CAS; never mutate a stale reference.
    const e = c.journal.find((e) => e.sequence === planned.sequence)!;
    const b = c.bindings.find((b) => b.attemptId === attempt.attemptId)!;
    const stillCurrent = await bindingCurrent(attempt.attemptId);
    if (!stillCurrent.success) {
      failure = "TASK_CONTEXT_STALE";
      break;
    }
    const beforeEffect = await adapter.snapshot();
    const applied = c.journal.filter(
      (e) => e.attemptId === attempt.attemptId && e.status === "applied",
    );
    if (
      !beforeEffect.success ||
      !auditTaskApplication(
        b.beforeSnapshot,
        beforeEffect.data,
        applied.filter((e) => e.type === "file").map((e) => e.path),
        applied.filter((e) => e.type === "directory").map((e) => e.path),
      ).success
    ) {
      failure = "TASK_UNEXPECTED_CHANGES";
      break;
    }
    let effect: TaskParseResult<true>;
    if (e.type === "directory") effect = await adapter.createDirectory(e.path);
    else {
      const change = changes[e.changeIndex]!;
      const stage = await lease.stage(e.stagingId!, change.text);
      effect = stage.success ? await adapter.install(lease, e.stagingId!, change) : stage;
    }
    if (!effect.success) {
      failure = "TASK_CHANGE_APPLY_FAILED";
      break;
    }
    e.status = "applied";
    e.observation =
      e.type === "file" ? { type: "file", fileHash: e.afterHash } : { type: "directory" };
    if (e.type === "file") {
      b.postimages.push({ path: e.path, fileHash: e.afterHash });
      c.run.attempts
        .find((a) => a.attemptId === attempt.attemptId)!
        .application.effects.push({
          path: e.path,
          beforeHash: e.beforeHash,
          afterHash: e.afterHash,
          changeIndex: e.changeIndex,
          sequence: e.sequence,
        });
    }
    const current = await adapter.snapshot();
    if (!current.success) {
      failure = "TASK_PROJECT_DRIFT";
      break;
    }
    c.run.project.latestProjectRevision = current.data.revision;
    stored = await save("effect", task.taskId);
    if (!stored.success) return stored;
  }
  const a = c.run.attempts.find((a) => a.attemptId === attempt.attemptId)!;
  const b = c.bindings.find((b) => b.attemptId === attempt.attemptId)!;
  const current = await adapter.snapshot();
  const applied = c.journal.filter((e) => e.attemptId === a.attemptId && e.status === "applied");
  if (
    !current.success ||
    !auditTaskApplication(
      b.beforeSnapshot,
      current.data,
      applied.filter((e) => e.type === "file").map((e) => e.path),
      applied.filter((e) => e.type === "directory").map((e) => e.path),
    ).success ||
    !(await bindingCurrent(a.attemptId)).success
  )
    failure ??= "TASK_UNEXPECTED_CHANGES";
  if (current.success) c.run.project.latestProjectRevision = current.data.revision;
  a.application.status = failure
    ? a.application.effects.length
      ? "partially_applied"
      : "not_applied"
    : "applied";
  a.application.failureCode = failure
    ? a.application.effects.length
      ? "TASK_PARTIAL_APPLY"
      : failure
    : null;
  a.application.resultingProjectRevision = current.success ? current.data.revision : null;
  a.status = failure ? "needs_review" : "verifying";
  const state = c.run.tasks.find((t) => t.taskId === a.taskId)!;
  state.status = failure ? "needs_review" : "verifying";
  state.reasonCode = a.application.failureCode;
  c.run.status = failure ? "needs_review" : "active";
  stored = await save("transition", a.taskId, a.application.failureCode ?? undefined);
  return stored;
}
