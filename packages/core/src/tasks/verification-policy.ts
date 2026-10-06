import * as z from "zod";
import { taskContentHash, freezeTaskValue, compareTaskIds } from "./canonical.js";
import {
  TASK_CHECK_IDS,
  taskHashSchema,
  taskIdSchema,
  taskCounterSchema,
  taskPathSchema,
  taskTimestampSchema,
} from "./primitives.js";
import { taskFailure, type TaskParseResult } from "./parse.js";

/** Independently reviewed bindings, never read from a model or task draft. */
export const taskVerificationPolicySchema = z.strictObject({
  schemaVersion: z.literal(1),
  catalogRevision: taskHashSchema,
  definitions: z
    .array(
      z.strictObject({
        checkId: z.enum(TASK_CHECK_IDS),
        definitionRevision: taskHashSchema,
        authority: z.enum(["executor", "reviewer"]),
        criterionIds: z.array(taskIdSchema).max(512),
        requiredTestIds: z.array(taskIdSchema).max(4096),
        evidenceArtifactIds: z.array(taskIdSchema).max(128),
      }),
    )
    .min(1)
    .max(5),
});
export const taskCheckObservationSchema = z.strictObject({
  checkId: z.enum(TASK_CHECK_IDS),
  definitionRevision: taskHashSchema,
  checkedRevision: taskHashSchema,
  provenance: z.enum(["executor", "reviewer", "model_claim"]),
  disposition: z.enum(["completed", "unavailable", "interrupted"]),
  reportStatus: z.enum(["valid", "invalid", "incomplete"]),
  exitCode: taskCounterSchema.nullable(),
  timedOut: z.boolean(),
  truncated: z.boolean(),
  durationMs: taskCounterSchema,
  outputHash: taskHashSchema.nullable(),
  evidenceArtifactIds: z.array(taskIdSchema).max(128),
  testInventory: z
    .strictObject({
      discovered: z.array(taskIdSchema).max(4096),
      passed: z.array(taskIdSchema).max(4096),
      failed: z.array(taskIdSchema).max(4096),
      skipped: z.array(taskIdSchema).max(4096),
      todo: z.array(taskIdSchema).max(4096),
      focused: z.boolean(),
      complete: z.boolean(),
    })
    .nullable(),
});
export const taskVerificationAuditSchema = z.strictObject({
  beforeRevision: taskHashSchema,
  afterRevision: taskHashSchema,
  currentRevision: taskHashSchema,
  immutableInputsConfirmed: z.boolean(),
  complete: z.boolean(),
  unexpectedChanges: z.array(taskPathSchema).max(1024),
  startedAt: taskTimestampSchema,
  finishedAt: taskTimestampSchema,
  durationMs: taskCounterSchema,
});
export type TaskVerificationPolicy = z.infer<typeof taskVerificationPolicySchema>;
export type TaskCheckObservation = z.infer<typeof taskCheckObservationSchema>;
export type TaskVerificationAudit = z.infer<typeof taskVerificationAuditSchema>;

export function taskVerificationCatalogHash(
  definitions: TaskVerificationPolicy["definitions"],
): string {
  return taskContentHash({
    schemaVersion: 1,
    definitions: [...definitions]
      .sort((a, b) => compareTaskIds(a.checkId, b.checkId))
      .map((d) => ({
        ...d,
        criterionIds: [...d.criterionIds].sort(),
        requiredTestIds: [...d.requiredTestIds].sort(),
        evidenceArtifactIds: [...d.evidenceArtifactIds].sort(),
      })),
  });
}
export function validateTaskVerificationPolicy(
  value: unknown,
): TaskParseResult<TaskVerificationPolicy> {
  const parsed = taskVerificationPolicySchema.safeParse(value);
  if (!parsed.success) return taskFailure("TASK_CHECK_BLOCKED", "Verification policy is invalid.");
  const policy = parsed.data;
  const duplicate = (values: readonly string[]) => new Set(values).size !== values.length;
  if (
    duplicate(policy.definitions.map((d) => d.checkId)) ||
    policy.definitions.some(
      (d) =>
        duplicate(d.criterionIds) ||
        duplicate(d.requiredTestIds) ||
        (d.checkId === "ts.unit"
          ? d.requiredTestIds.length === 0
          : d.requiredTestIds.length !== 0) ||
        duplicate(d.evidenceArtifactIds) ||
        (d.authority === "reviewer" &&
          !["task.acceptance", "phase.acceptance"].includes(d.checkId)),
    )
  )
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Verification policy has conflicting authority bindings.",
    );
  if (taskVerificationCatalogHash(policy.definitions) !== policy.catalogRevision)
    return taskFailure(
      "TASK_CHECK_DEFINITION_CHANGED",
      "Verification catalog identity differs from its definitions.",
    );
  return { success: true, data: freezeTaskValue(policy) };
}
