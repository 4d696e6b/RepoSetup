import * as z from "zod";
import {
  taskHashSchema,
  taskPositiveCounterSchema,
  taskResourceLimitsSchema,
} from "./primitives.js";
import {
  taskConfigurationSchema,
  taskEffectiveConfigurationSchema,
  taskUsageSchema,
} from "./evidence-schema.js";
import { taskProviderReservationSchema } from "./provider.js";
import { taskPlanSchema } from "./plan-schema.js";
import { taskContentHash, freezeTaskValue } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import type { TaskReview } from "./review-schema.js";
/** One allowance slot per independently reviewed phase. Changing call options cannot reset it. */
export function taskCompilationAllowanceId(review: TaskReview): string {
  return taskContentHash({ kind: "task_compilation_allowance", schemaVersion: 1, review });
}
export const taskCompilationCheckpointSchema = z.strictObject({
  kind: z.literal("task_compilation_checkpoint"),
  schemaVersion: z.literal(1),
  checkpointHash: taskHashSchema,
  compilationId: taskHashSchema,
  stateRevision: taskPositiveCounterSchema.max(2),
  reviewHash: taskHashSchema,
  rootInstance: taskHashSchema,
  contextId: taskHashSchema,
  requestHash: taskHashSchema,
  requestedConfiguration: taskConfigurationSchema,
  effectiveConfiguration: taskEffectiveConfigurationSchema,
  limits: taskResourceLimitsSchema,
  reservation: taskProviderReservationSchema,
  status: z.enum([
    "pending",
    "completed",
    "refused",
    "incomplete",
    "invalid",
    "failed",
    "cancelled",
    "needs_review",
  ]),
  usage: taskUsageSchema.nullable(),
  plan: taskPlanSchema.nullable(),
});
export type TaskCompilationCheckpoint = z.infer<typeof taskCompilationCheckpointSchema>;
export function sealTaskCompilationCheckpoint(
  value: Omit<TaskCompilationCheckpoint, "checkpointHash">,
): TaskCompilationCheckpoint {
  return freezeTaskValue({ ...value, checkpointHash: taskContentHash(value) });
}
export function validateTaskCompilationCheckpoint(
  value: unknown,
): TaskParseResult<TaskCompilationCheckpoint> {
  const parsed = taskCompilationCheckpointSchema.safeParse(value);
  if (!parsed.success)
    return taskFailure("TASK_RUN_STATE_INVALID", "Compilation checkpoint is malformed.");
  const c = parsed.data,
    { checkpointHash, ...payload } = c;
  if (
    checkpointHash !== taskContentHash(payload) ||
    (c.status === "pending" ? c.usage !== null : c.usage === null) ||
    (c.stateRevision === 1) !== (c.status === "pending") ||
    (c.status === "completed") !== (c.plan !== null) ||
    (c.status === "completed" &&
      (!c.usage ||
        [c.usage.inputTokens, c.usage.outputTokens, c.usage.costMicrousd].some(
          (u) => u.provenance === "unknown",
        ) ||
        c.usage.durationMs >= c.limits.maxWallTimeMs ||
        (["inputTokens", "outputTokens", "costMicrousd"] as const).some(
          (key) => "value" in c.usage![key] && c.usage![key].value > c.reservation[key],
        )))
  )
    return taskFailure(
      "TASK_RUN_STATE_INVALID",
      "Compilation checkpoint integrity/relations are invalid.",
    );
  return { success: true, data: freezeTaskValue(c) };
}
