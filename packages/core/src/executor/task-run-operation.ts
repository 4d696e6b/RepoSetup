import * as z from "zod";
import { taskConfigurationSchema } from "../tasks/evidence-schema.js";
import {
  taskHashSchema,
  taskIdSchema,
  taskResourceLimitsSchema,
  taskRunIdSchema,
  taskPositiveCounterSchema,
  taskCounterSchema,
} from "../tasks/primitives.js";

/** Host operation boundary; never a model tool or persisted executable recipe. */
export const taskRunOperationSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("create"),
    resourceLimits: taskResourceLimitsSchema,
    expectedBaselineTreeHash: taskHashSchema.optional(),
    managedCompilationId: taskHashSchema.optional(),
    initialDurationMs: taskCounterSchema.optional(),
  }),
  z.strictObject({
    type: z.literal("begin"),
    runId: taskRunIdSchema,
    taskId: taskIdSchema,
    requestedConfiguration: taskConfigurationSchema,
    routingId: taskHashSchema,
  }),
  z.strictObject({
    type: z.literal("begin_routed"),
    runId: taskRunIdSchema,
    taskId: taskIdSchema,
    maxOutputTokens: taskPositiveCounterSchema.max(16384),
  }),
  z.strictObject({ type: z.literal("apply"), runId: taskRunIdSchema, proposal: z.unknown() }),
  z.strictObject({ type: z.literal("no_change"), runId: taskRunIdSchema }),
  z.strictObject({
    type: z.literal("request"),
    runId: taskRunIdSchema,
    allowProviderUsage: z.literal(true),
    maxOutputTokens: taskPositiveCounterSchema.max(16384),
    timeoutMs: taskPositiveCounterSchema.max(120000),
    allowRepair: z.boolean().optional(),
  }),
  z.strictObject({ type: z.literal("verify"), runId: taskRunIdSchema, taskId: taskIdSchema }),
  z.strictObject({ type: z.literal("finalize"), runId: taskRunIdSchema }),
  z.strictObject({
    type: z.literal("stop"),
    runId: taskRunIdSchema,
    taskId: taskIdSchema,
    code: z.enum([
      "TASK_BUDGET_EXHAUSTED",
      "TASK_ATTEMPT_LIMIT_EXCEEDED",
      "TASK_OUTPUT_INCOMPLETE",
      "TASK_CAPABILITY_UNAVAILABLE",
      "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
      "TASK_CONTEXT_UNRESOLVED",
    ]),
  }),
  z.strictObject({
    type: z.literal("reconcile"),
    runId: taskRunIdSchema,
    reviewed: z.boolean().optional(),
  }),
]);
export type TaskRunOperation = z.infer<typeof taskRunOperationSchema>;
