import * as z from "zod";
import { TASK_ERROR_CODES } from "./errors.js";
import {
  taskAttemptIdSchema,
  taskCapabilitySchema,
  taskCounterSchema,
  taskEnvelope,
  taskHashSchema,
  taskIdSchema,
  taskPathSchema,
  taskPositiveCounterSchema,
  taskRunIdSchema,
  taskSelectorSchema,
  taskSourceRefSchema,
  taskStatementSchema,
  taskTimestampSchema,
} from "./primitives.js";

export const taskErrorCodeSchema = z.enum(TASK_ERROR_CODES);
export const taskArtifactRevisionSchema = z.strictObject({
  producerTaskId: taskIdSchema,
  artifactId: taskIdSchema,
  attemptId: taskAttemptIdSchema,
  acceptanceRevision: taskHashSchema,
  verificationId: taskHashSchema,
  paths: z
    .array(z.strictObject({ path: taskPathSchema, fileHash: taskHashSchema }))
    .min(1)
    .max(20),
});
export const taskUnresolvedReferenceSchema = z.strictObject({
  requestingTaskId: taskIdSchema,
  source: taskSourceRefSchema.optional(),
  target: taskPathSchema,
  reason: taskStatementSchema,
  required: z.boolean(),
});
export const taskContextSchema = z.strictObject({
  ...taskEnvelope("task_context"),
  contextId: taskHashSchema,
  planId: taskHashSchema,
  taskId: taskIdSchema,
  inputRevision: taskHashSchema,
  sources: z
    .array(
      taskSourceRefSchema.extend({
        selectionHash: taskHashSchema,
        byteLength: taskCounterSchema,
        inclusionReasons: z
          .array(
            z.enum([
              "explicit_reference",
              "write_target",
              "requirement",
              "nearby_test",
              "local_import",
              "interface",
              "applicable_rule",
              "predecessor_output",
            ]),
          )
          .min(1)
          .max(8),
        required: z.boolean(),
      }),
    )
    .max(1024),
  rules: z
    .array(
      z.strictObject({
        path: taskPathSchema,
        fileHash: taskHashSchema,
        applicabilityScope: taskSelectorSchema,
      }),
    )
    .max(128),
  predecessorArtifacts: z.array(taskArtifactRevisionSchema).max(512),
  size: z.strictObject({
    bytes: taskCounterSchema.max(262144),
    estimatedInputTokens: taskCounterSchema,
    estimatorId: taskIdSchema,
  }),
  unresolvedReferences: z.array(taskUnresolvedReferenceSchema).max(128),
});
export const taskConfigurationSchema = z.strictObject({
  adapterId: taskIdSchema,
  providerId: z.literal("openai-responses-v1"),
  modelProfileId: taskIdSchema,
  nativeEffortId: taskIdSchema,
});
export const taskEffectiveConfigurationSchema = z.discriminatedUnion("provenance", [
  z.strictObject({ provenance: z.literal("unknown") }),
  z.strictObject({
    provenance: z.enum(["provider_reported", "adapter_confirmed", "host_reported"]),
    configuration: taskConfigurationSchema,
  }),
]);
export const taskRoutingSchema = z.strictObject({
  ...taskEnvelope("routing_decision"),
  routingId: taskHashSchema,
  planId: taskHashSchema,
  taskId: taskIdSchema,
  contextId: taskHashSchema,
  catalogRevision: taskHashSchema,
  policyRevision: taskHashSchema,
  requiredCapabilities: taskCapabilitySchema,
  selected: taskConfigurationSchema.extend({
    maxContextTokens: taskPositiveCounterSchema,
    maxOutputTokens: taskPositiveCounterSchema,
    enforcement: z.enum(["managed", "advisory"]),
    effectiveConfiguration: taskEffectiveConfigurationSchema,
  }),
  rejectedCandidates: z
    .array(
      z.strictObject({
        modelProfileId: taskIdSchema,
        nativeEffortId: taskIdSchema,
        reasons: z
          .array(
            z.enum([
              "adapter_unavailable",
              "model_unavailable",
              "unsupported_effort",
              "missing_capabilities",
              "context_capacity",
              "output_capacity",
              "allowance_required",
              "budget_exhausted",
              "model_unqualified",
              "qualification_expired",
            ]),
          )
          .min(1),
      }),
    )
    .max(128),
  rationale: taskStatementSchema,
});
export const taskUsageValueSchema = z.discriminatedUnion("provenance", [
  z.strictObject({ provenance: z.literal("unknown") }),
  z.strictObject({
    provenance: z.enum(["reported", "estimated", "host_reported"]),
    value: taskCounterSchema,
  }),
]);
export const taskUsageSchema = z.strictObject({
  inputTokens: taskUsageValueSchema,
  outputTokens: taskUsageValueSchema,
  reasoningTokens: taskUsageValueSchema,
  cachedInputTokens: taskUsageValueSchema,
  totalTokens: taskUsageValueSchema,
  costMicrousd: taskUsageValueSchema,
  providerCallId: z
    .string()
    .regex(/^[A-Za-z0-9_.:-]{1,256}$/)
    .nullable(),
  durationMs: taskCounterSchema,
  priceCatalogRevision: taskHashSchema.nullable(),
  reserved: z.strictObject({
    calls: taskCounterSchema,
    inputTokens: taskCounterSchema,
    outputTokens: taskCounterSchema,
    costMicrousd: taskCounterSchema,
  }),
});
export const taskVerificationSchema = z.strictObject({
  ...taskEnvelope("task_verification_result"),
  verificationId: taskHashSchema,
  planId: taskHashSchema,
  runId: taskRunIdSchema,
  target: z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("task"), taskId: taskIdSchema }),
    z.strictObject({ type: z.literal("phase"), phaseId: taskIdSchema }),
  ]),
  checkedRevision: taskHashSchema,
  inputRevision: taskHashSchema,
  checkCatalogRevision: taskHashSchema,
  outcome: z.enum(["pass", "fail", "blocked", "needs_review"]),
  checks: z
    .array(
      z.strictObject({
        checkId: taskIdSchema,
        definitionRevision: taskHashSchema,
        status: z.enum(["pass", "fail", "blocked", "needs_review"]),
        provenance: z.enum(["executor", "reviewer", "model_claim"]),
        evidenceArtifactIds: z.array(taskIdSchema).max(128),
        durationMs: taskCounterSchema,
        failureCode: taskErrorCodeSchema.nullable(),
        exitCode: taskCounterSchema.nullable(),
        timedOut: z.boolean(),
        truncated: z.boolean(),
        discoveredTests: taskCounterSchema.nullable(),
        executedTests: taskCounterSchema.nullable(),
        outputHash: taskHashSchema.nullable(),
      }),
    )
    .max(128),
  criterionCoverage: z
    .array(
      z.strictObject({
        criterionId: taskIdSchema,
        checkIds: z.array(taskIdSchema),
        evidenceArtifactIds: z.array(taskIdSchema),
        satisfied: z.boolean(),
      }),
    )
    .max(512),
  unexpectedChanges: z.array(taskPathSchema).max(1024),
  startedAt: taskTimestampSchema,
  finishedAt: taskTimestampSchema,
  durationMs: taskCounterSchema,
});
export type TaskContext = z.infer<typeof taskContextSchema>;
export type RoutingDecision = z.infer<typeof taskRoutingSchema>;
export type TaskVerificationResult = z.infer<typeof taskVerificationSchema>;
