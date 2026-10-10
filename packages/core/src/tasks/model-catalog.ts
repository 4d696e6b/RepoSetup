import * as z from "zod";
import {
  taskHashSchema,
  taskIdSchema,
  taskPositiveCounterSchema,
  taskTimestampSchema,
  taskCapabilitySchema,
} from "./primitives.js";
import { taskContentHash, freezeTaskValue } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";

/** Trusted host evidence, never a model/config declaration of capability. */
export const taskModelProfileSchema = z.strictObject({
  profileId: taskIdSchema,
  adapterId: z.literal("openai-responses-v1"),
  providerId: z.literal("openai-responses-v1"),
  available: z.boolean(),
  reviewedAt: taskTimestampSchema,
  validUntil: taskTimestampSchema,
  qualification: z.discriminatedUnion("status", [
    z.strictObject({ status: z.literal("unconfirmed") }),
    z.strictObject({
      status: z.literal("qualified"),
      scope: z.enum(["offline", "live"]),
      evidenceHash: taskHashSchema,
      capabilityClass: z.enum(["baseline", "strong"]),
      features: taskCapabilitySchema.shape.features,
    }),
  ]),
  // Order is a reviewed, model-specific policy, not a universal effort ladder.
  efforts: z
    .array(
      z.strictObject({
        nativeEffortId: taskIdSchema,
        minimumOutputTokens: taskPositiveCounterSchema.max(16384),
      }),
    )
    .min(1)
    .max(8),
  maxContextTokens: taskPositiveCounterSchema,
  maxOutputTokens: taskPositiveCounterSchema.max(16384),
  price: z.strictObject({
    catalogRevision: taskHashSchema,
    inputMicrousdPerToken: z.number().positive().max(1000000),
    outputMicrousdPerToken: z.number().positive().max(1000000),
  }),
});
export const taskModelCatalogSchema = z.strictObject({
  kind: z.literal("task_model_catalog"),
  schemaVersion: z.literal(1),
  catalogRevision: taskHashSchema,
  profiles: z.array(taskModelProfileSchema).min(1).max(16),
});
export type TaskModelCatalog = z.infer<typeof taskModelCatalogSchema>;
export type TaskModelProfile = z.infer<typeof taskModelProfileSchema>;
export function sealTaskModelCatalog(
  value: Omit<TaskModelCatalog, "catalogRevision">,
): TaskModelCatalog {
  return freezeTaskValue({ ...value, catalogRevision: taskContentHash(value) });
}
export function validateTaskModelCatalog(value: unknown): TaskParseResult<TaskModelCatalog> {
  const parsed = taskModelCatalogSchema.safeParse(value);
  if (!parsed.success)
    return taskFailure(
      "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
      "Model catalog violates the reviewed versioned boundary.",
    );
  const { catalogRevision, ...payload } = parsed.data;
  if (
    catalogRevision !== taskContentHash(payload) ||
    new Set(parsed.data.profiles.map((p) => p.profileId)).size !== parsed.data.profiles.length ||
    parsed.data.profiles.some(
      (p) =>
        Date.parse(p.reviewedAt) >= Date.parse(p.validUntil) ||
        new Set(p.efforts.map((e) => e.nativeEffortId)).size !== p.efforts.length ||
        p.efforts.some((e) => e.minimumOutputTokens > p.maxOutputTokens),
    )
  )
    return taskFailure(
      "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
      "Model catalog identity, dates or native effort mappings are inconsistent.",
    );
  return { success: true, data: freezeTaskValue(parsed.data) };
}
