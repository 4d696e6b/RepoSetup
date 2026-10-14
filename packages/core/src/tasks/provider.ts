import * as z from "zod";
import {
  taskConfigurationSchema,
  taskEffectiveConfigurationSchema,
  taskUsageSchema,
} from "./evidence-schema.js";
import { taskCounterSchema, taskHashSchema, taskPositiveCounterSchema } from "./primitives.js";
import type { TaskParseResult } from "./parse.js";

export const taskProviderReservationSchema = z.strictObject({
  calls: z.literal(1),
  inputTokens: taskPositiveCounterSchema,
  outputTokens: taskPositiveCounterSchema.max(16384),
  costMicrousd: taskPositiveCounterSchema,
});
export const taskPreparedProviderRequestSchema = z.strictObject({
  purpose: z.enum(["decomposition", "coding"]),
  configuration: taskConfigurationSchema,
  requestHash: taskHashSchema,
  payload: z.string().max(196608),
  reservation: taskProviderReservationSchema,
  priceCatalogRevision: taskHashSchema,
  timeoutMs: taskPositiveCounterSchema.max(120000),
});
export const taskProviderObservationSchema = z.strictObject({
  outcome: z.enum(["completed", "refused", "incomplete", "invalid", "failed", "cancelled"]),
  document: z.unknown(),
  effectiveConfiguration: taskEffectiveConfigurationSchema,
  usage: taskUsageSchema,
  httpStatus: taskCounterSchema.max(599).nullable(),
});
export type TaskPreparedProviderRequest = z.infer<typeof taskPreparedProviderRequestSchema>;
export type TaskProviderObservation = z.infer<typeof taskProviderObservationSchema>;
/** Provider-neutral trusted host capability. Only executors dispatch; no model tools exist. */
export interface TaskProviderAdapter {
  configuration: z.infer<typeof taskConfigurationSchema>;
  prepare(input: {
    purpose: "decomposition" | "coding";
    document: object;
    maxOutputTokens: number;
    timeoutMs: number;
  }): TaskParseResult<TaskPreparedProviderRequest>;
  dispatch(
    request: TaskPreparedProviderRequest,
    signal?: AbortSignal,
  ): Promise<TaskProviderObservation>;
}
