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
import { taskVerifierSnapshotSchema, compareTaskVerifierSnapshots } from "./verifier-files.js";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import {
  taskConfigurationSchema,
  taskEffectiveConfigurationSchema,
  taskUsageSchema,
} from "./evidence-schema.js";
import { taskProviderReservationSchema } from "./provider.js";

export const taskRunCheckpointSchema = z.strictObject({
  kind: z.literal("task_run_checkpoint"),
  schemaVersion: z.literal(1),
  checkpointHash: taskHashSchema,
  policyRevision: taskHashSchema,
  rootInstance: taskHashSchema,
  baselineSnapshot: taskVerifierSnapshotSchema,
  phaseVerificationPending: z.boolean(),
  compilation: z
    .strictObject({
      compilationId: taskHashSchema,
      reservation: taskProviderReservationSchema,
      usage: taskUsageSchema,
    })
    .optional(),
  providerCalls: z
    .array(
      z.strictObject({
        callId: z.string().regex(/^call-[1-9][0-9]*$/),
        attemptId: taskAttemptIdSchema,
        requestHash: taskHashSchema,
        contextId: taskHashSchema,
        inputRevision: taskHashSchema,
        requestedConfiguration: taskConfigurationSchema,
        effectiveConfiguration: taskEffectiveConfigurationSchema,
        reservation: taskProviderReservationSchema,
        status: z.enum([
          "pending",
          "completed",
          "refused",
          "incomplete",
          "invalid",
          "failed",
          "cancelled",
        ]),
        usage: taskUsageSchema.nullable(),
      }),
    )
    .max(10000)
    .optional(),
  run: phaseRunSchema,
  bindings: z
    .array(
      z.strictObject({
        attemptId: taskAttemptIdSchema,
        verificationPending: z.boolean(),
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
        observation: z
          .discriminatedUnion("type", [
            z.strictObject({ type: z.literal("absent") }),
            z.strictObject({ type: z.literal("file"), fileHash: taskHashSchema }),
            z.strictObject({ type: z.literal("directory") }),
            z.strictObject({ type: z.literal("unavailable") }),
          ])
          .nullable(),
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
    c.baselineSnapshot.rootIdentity !== run.project.rootIdentity ||
    !compareTaskVerifierSnapshots(c.baselineSnapshot, c.baselineSnapshot).success ||
    ids.size !== run.tasks.length ||
    attempts.size !== run.attempts.length ||
    (c.compilation !== undefined &&
      !run.resourceLedger.reservations.some(
        (r) =>
          r.reservationId === "compilation" &&
          r.attemptId === null &&
          taskContentHash({
            calls: r.calls,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
            costMicrousd: r.costMicrousd,
          }) === taskContentHash(c.compilation!.reservation),
      )) ||
    (c.providerCalls ?? []).some(
      (call, i) =>
        call.callId !== `call-${i + 1}` ||
        !attempts.has(call.attemptId) ||
        !run.resourceLedger.reservations.some(
          (r) =>
            r.reservationId === call.callId &&
            r.attemptId === call.attemptId &&
            taskContentHash({
              calls: r.calls,
              inputTokens: r.inputTokens,
              outputTokens: r.outputTokens,
              costMicrousd: r.costMicrousd,
            }) === taskContentHash(call.reservation),
        ) ||
        (call.status === "pending" ? call.usage !== null : call.usage === null),
    ) ||
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
        b.beforeSnapshot.rootIdentity !== run.project.rootIdentity ||
        !compareTaskVerifierSnapshots(b.beforeSnapshot, b.beforeSnapshot).success ||
        new Set(b.writeTargets.map((t) => t.path)).size !== b.writeTargets.length ||
        new Set(b.postimages.map((t) => t.path)).size !== b.postimages.length ||
        b.postimages.some((p) => !b.writeTargets.some((t) => t.path === p.path))
      );
    }) ||
    c.journal.some(
      (e, i) =>
        e.sequence !== i + 1 ||
        !attempts.has(e.attemptId) ||
        (e.type === "file" ? e.stagingId === null : e.stagingId !== null) ||
        (e.status === "applied" && e.observation === null),
    ) ||
    new Set(c.journal.filter((e) => e.stagingId).map((e) => e.stagingId)).size !==
      c.journal.filter((e) => e.stagingId).length ||
    run.tasks.some((t) => {
      const a = attempts.get(t.attemptIds.at(-1) ?? "");
      return (
        t.status === "accepted" &&
        (!a ||
          a.status !== "accepted" ||
          a.application.status !== "applied" ||
          a.verification?.outcome !== "pass" ||
          a.verification.verificationId !== t.acceptedVerificationId)
      );
    }) ||
    c.bindings.some((b) => {
      const expected = c.journal
        .filter((e) => e.attemptId === b.attemptId && e.type === "file" && e.status === "applied")
        .map((e) => ({ path: e.path, fileHash: e.afterHash }));
      return taskContentHash(expected) !== taskContentHash(b.postimages);
    }) ||
    run.attempts.some((a) =>
      a.application.effects.some(
        (effect) =>
          !c.journal.some(
            (e) =>
              e.sequence === effect.sequence &&
              e.attemptId === a.attemptId &&
              e.type === "file" &&
              e.status === "applied" &&
              e.path === effect.path &&
              e.beforeHash === effect.beforeHash &&
              e.afterHash === effect.afterHash &&
              e.changeIndex === effect.changeIndex,
          ),
      ),
    ) ||
    run.attempts.some((a) => {
      const v = a.verification;
      if (!v) return false;
      const { verificationId, ...payload } = v;
      return (
        verificationId !== taskContentHash(payload) ||
        v.planId !== run.planId ||
        v.runId !== run.runId ||
        v.inputRevision !== a.inputRevision ||
        v.target.type !== "task" ||
        v.target.taskId !== a.taskId
      );
    }) ||
    run.stateRevision !== run.events.length + 1 ||
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
