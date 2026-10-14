import * as z from "zod";
import {
  taskEnvelope,
  taskIdSchema,
  taskResourceLimitsSchema,
  taskSelectorSchema,
} from "./primitives.js";

export const taskPreferencesSchema = z.strictObject({
  ...taskEnvelope("task_preferences"),
  executionMode: z.enum(["handoff", "managed"]),
  qualityPreference: z.enum(["conservative", "balanced"]),
  supportProfileId: z.literal("managed-ts-node-v1"),
  providerAvailability: z
    .array(
      z.strictObject({
        providerId: z.literal("openai-responses-v1"),
        enabled: z.boolean(),
        modelProfileIds: z.array(taskIdSchema).max(32),
      }),
    )
    .max(1),
  effortPreference: z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("minimum_supported") }),
    z.strictObject({ type: z.literal("explicit"), nativeEffortId: taskIdSchema }),
  ]),
  resourceLimits: taskResourceLimitsSchema,
  exclusions: z.array(taskSelectorSchema).max(1024),
});
export type TaskPreferences = z.infer<typeof taskPreferencesSchema>;
