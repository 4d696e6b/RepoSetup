import * as z from "zod";
import { taskConfigurationSchema } from "../tasks/evidence-schema.js";
import {
  taskHashSchema,
  taskIdSchema,
  taskResourceLimitsSchema,
  taskRunIdSchema,
} from "../tasks/primitives.js";

/** Host operation boundary; never a model tool or persisted executable recipe. */
export const taskRunOperationSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("create"), resourceLimits: taskResourceLimitsSchema }),
  z.strictObject({
    type: z.literal("begin"),
    runId: taskRunIdSchema,
    taskId: taskIdSchema,
    requestedConfiguration: taskConfigurationSchema,
    routingId: taskHashSchema,
  }),
  z.strictObject({ type: z.literal("apply"), runId: taskRunIdSchema, proposal: z.unknown() }),
  z.strictObject({ type: z.literal("no_change"), runId: taskRunIdSchema }),
  z.strictObject({ type: z.literal("verify"), runId: taskRunIdSchema, taskId: taskIdSchema }),
  z.strictObject({ type: z.literal("finalize"), runId: taskRunIdSchema }),
  z.strictObject({
    type: z.literal("reconcile"),
    runId: taskRunIdSchema,
    reviewed: z.boolean().optional(),
  }),
]);
export type TaskRunOperation = z.infer<typeof taskRunOperationSchema>;
