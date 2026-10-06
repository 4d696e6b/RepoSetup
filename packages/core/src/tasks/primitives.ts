import * as z from "zod";

export const TASK_SCHEMA_VERSION = 1 as const;
export const TASK_DOCUMENT_LIMITS = { bytes: 1048576, depth: 32, tasks: 96 } as const;
export const TASK_CHECK_IDS = [
  "ts.typecheck",
  "ts.lint",
  "ts.unit",
  "task.acceptance",
  "phase.acceptance",
] as const;
export const TASK_REQUIRED_CHECK_IDS = [
  "ts.typecheck",
  "ts.lint",
  "ts.unit",
  "task.acceptance",
] as const;
export const TASK_STATES = [
  "queued",
  "ready",
  "running",
  "verifying",
  "accepted",
  "needs_repair",
  "blocked",
  "needs_review",
  "invalidated",
  "cancelled",
] as const;
export const PHASE_RUN_STATES = [
  "prepared",
  "active",
  "blocked",
  "needs_review",
  "succeeded",
  "failed",
  "cancelled",
  "interrupted",
] as const;

export function isWellFormedTaskString(text: string): boolean {
  return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text);
}
export const taskTextSchema = z.string().max(262144).refine(isWellFormedTaskString, {
  message: "Task strings must contain well-formed Unicode.",
});
export const taskStatementSchema = taskTextSchema.refine((text) => text.trim().length > 0);
export const taskIdSchema = taskTextSchema.refine(
  (id) => id.length <= 64 && /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(id),
);
export const taskHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export const taskCounterSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const taskPositiveCounterSchema = taskCounterSchema.refine((value) => value > 0);
export const taskTimestampSchema = z.iso.datetime();
export const taskRunIdSchema = z.uuid();
export const taskAttemptIdSchema = z
  .string()
  .regex(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*\/[1-3]$/,
  );

export function isSafeTaskPath(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 1024 &&
    isWellFormedTaskString(value) &&
    value.normalize("NFC") === value &&
    value.trim() === value &&
    !/[\\:*?[\]{}]/.test(value) &&
    ![...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) &&
    value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..")
  );
}

export const taskPathSchema = taskTextSchema.refine(isSafeTaskPath, {
  message: "Use an exact NFC project-relative task path without traversal, globs or separators.",
});
export const taskLineRangeSchema = z
  .strictObject({
    start: taskPositiveCounterSchema,
    end: taskPositiveCounterSchema,
  })
  .refine((range) => range.end >= range.start);
export const taskSourceRefSchema = z.strictObject({
  path: taskPathSchema,
  fileHash: taskHashSchema,
  lineRange: taskLineRangeSchema.optional(),
});
export const taskSelectorSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("file"), path: taskPathSchema }),
  z.strictObject({ type: z.literal("subtree"), path: taskPathSchema }),
]);
export const taskScopeSchema = z.strictObject({
  read: z.array(taskSelectorSchema).max(1024),
  write: z.array(taskPathSchema).max(20),
  deny: z.array(taskSelectorSchema).max(1024),
});
export const taskResourceLimitsSchema = z.strictObject({
  maxImplementationAttemptsPerTask: taskPositiveCounterSchema.refine((value) => value <= 3),
  maxProviderCalls: taskPositiveCounterSchema,
  maxInputTokens: taskPositiveCounterSchema,
  maxOutputTokens: taskPositiveCounterSchema,
  maxWallTimeMs: taskPositiveCounterSchema,
  maxCostMicrousd: taskPositiveCounterSchema,
});
export const taskCapabilitySchema = z.strictObject({
  features: z
    .array(
      z.enum([
        "mechanical_edit",
        "local_logic",
        "interface_change",
        "cross_module",
        "test_design",
        "security_sensitive",
        "ambiguity_resolution",
      ]),
    )
    .min(1)
    .max(7),
  minimumCapabilityClass: z.enum(["baseline", "strong"]),
  evidenceRefs: z
    .array(
      z.discriminatedUnion("type", [
        z.strictObject({ type: z.literal("requirement"), requirementId: taskIdSchema }),
        z.strictObject({ type: z.literal("source"), source: taskSourceRefSchema }),
        z.strictObject({ type: z.literal("constraint"), index: taskCounterSchema }),
      ]),
    )
    .min(1)
    .max(128),
});
export const taskProjectSchema = z.strictObject({
  rootIdentity: taskHashSchema,
  baselineCommit: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/),
  baselineTreeHash: taskHashSchema,
});
export function taskEnvelope<K extends string>(kind: K) {
  return { kind: z.literal(kind), schemaVersion: z.literal(TASK_SCHEMA_VERSION) };
}
