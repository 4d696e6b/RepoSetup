import * as z from "zod";
import { phaseRunSchema } from "./run-schema.js";
import { taskContextSchema } from "./evidence-schema.js";
import {
  taskAttemptIdSchema,
  taskCounterSchema,
  taskHashSchema,
  taskPathSchema,
  taskPositiveCounterSchema,
} from "./primitives.js";
import { taskVerifierSnapshotSchema } from "./verifier-files.js";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";

export const taskRunCheckpointSchema = z.strictObject({
  kind: z.literal("task_run_checkpoint"),
  schemaVersion: z.literal(1),
  checkpointHash: taskHashSchema,
  policyRevision: taskHashSchema,
  run: phaseRunSchema,
  bindings: z
    .array(
      z.strictObject({
        attemptId: taskAttemptIdSchema,
        context: taskContextSchema,
        writeTargets: z
          .array(z.strictObject({ path: taskPathSchema, fileHash: taskHashSchema.nullable() }))
          .max(20),
        postimages: z
          .array(z.strictObject({ path: taskPathSchema, fileHash: taskHashSchema }))
          .max(20),
        beforeSnapshot: taskVerifierSnapshotSchema,
      }),
    )
    .max(288),
  journal: z
    .array(
      z.strictObject({
        sequence: taskPositiveCounterSchema,
        attemptId: taskAttemptIdSchema,
        changeIndex: taskCounterSchema,
        type: z.enum(["file", "directory"]),
        path: taskPathSchema,
        beforeHash: taskHashSchema.nullable(),
        afterHash: taskHashSchema,
        stagingId: z.uuid().nullable(),
        status: z.enum(["pending", "applied", "not_applied", "unknown"]),
      }),
    )
    .max(10000),
});
export type TaskRunCheckpoint = z.infer<typeof taskRunCheckpointSchema>;
export function sealTaskRunCheckpoint(
  value: Omit<TaskRunCheckpoint, "checkpointHash">,
): TaskRunCheckpoint {
  return freezeTaskValue({ ...value, checkpointHash: taskContentHash(value) });
}
/** Storage integrity and relational validation. A checksum or imported pass record is not acceptance authority. */
export function validateTaskRunCheckpoint(value: unknown): TaskParseResult<TaskRunCheckpoint> {
  const parsed = taskRunCheckpointSchema.safeParse(value);
  if (!parsed.success)
    return taskFailure(
      "TASK_RUN_STATE_INVALID",
      "Durable checkpoint violates its versioned boundary.",
    );
  const c = parsed.data;
  const { checkpointHash, ...payload } = c;
  const run = c.run;
  const ids = new Set(run.tasks.map((t) => t.taskId));
  const attempts = new Map(run.attempts.map((a) => [a.attemptId, a]));
  if (
    checkpointHash !== taskContentHash(payload) ||
    ids.size !== run.tasks.length ||
    attempts.size !== run.attempts.length ||
    new Set(c.bindings.map((b) => b.attemptId)).size !== c.bindings.length ||
    c.bindings.length !== run.attempts.length ||
    run.attempts.some(
      (a) => a.runId !== run.runId || a.planId !== run.planId || !ids.has(a.taskId),
    ) ||
    run.tasks.some(
      (t) =>
        JSON.stringify(t.attemptIds) !==
        JSON.stringify(run.attempts.filter((a) => a.taskId === t.taskId).map((a) => a.attemptId)),
    ) ||
    run.attempts.some(
      (a) =>
        a.attemptNumber !==
        run.tasks.find((t) => t.taskId === a.taskId)!.attemptIds.indexOf(a.attemptId) + 1,
    ) ||
    (run.activeAttemptId !== null && !attempts.has(run.activeAttemptId)) ||
    c.bindings.some((b) => {
      const a = attempts.get(b.attemptId);
      const { contextId, ...context } = b.context;
      return (
        !a ||
        b.context.planId !== run.planId ||
        b.context.taskId !== a.taskId ||
        b.context.contextId !== a.contextId ||
        b.context.inputRevision !== a.inputRevision ||
        contextId !== taskContentHash(context) ||
        new Set(b.writeTargets.map((t) => t.path)).size !== b.writeTargets.length ||
        new Set(b.postimages.map((t) => t.path)).size !== b.postimages.length ||
        b.postimages.some((p) => !b.writeTargets.some((t) => t.path === p.path))
      );
    }) ||
    c.journal.some((e, i) => e.sequence !== i + 1 || !attempts.has(e.attemptId)) ||
    run.events.some(
      (e, i) =>
        e.sequence !== i + 1 ||
        e.previousStateRevision >= run.stateRevision ||
        (i > 0 && e.previousStateRevision <= run.events[i - 1]!.previousStateRevision),
    )
  )
    return taskFailure(
      "TASK_RUN_STATE_INVALID",
      "Durable identities, counters or relationships are inconsistent.",
    );
  return { success: true, data: freezeTaskValue(c) };
}
