import * as z from "zod";
import {
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  taskHashSchema,
  taskPositiveCounterSchema,
  taskScopeSchema,
} from "./primitives.js";
export const taskCompilationPolicySchema = z.strictObject({
  supportProfileId: z.literal("managed-ts-node-v1"),
  supportProfileRevision: taskPositiveCounterSchema,
  checkCatalogRevision: taskHashSchema,
  checkIds: z.array(z.enum(TASK_CHECK_IDS)).min(1).max(5),
  requiredCheckIds: z.array(z.enum(TASK_REQUIRED_CHECK_IDS)).min(1).max(4),
  authority: taskScopeSchema,
  caseSensitivePaths: z.boolean(),
});
export type TaskCompilationPolicy = z.infer<typeof taskCompilationPolicySchema>;
