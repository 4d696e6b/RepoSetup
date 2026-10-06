import * as z from "zod";
import { taskPhaseSelectionSchema } from "./plan-schema.js";
import { taskCompilationPolicySchema } from "./policy-schema.js";
import { taskEnvelope, taskProjectSchema } from "./primitives.js";
/** Independent user-reviewed inputs, never provider authority. No commands or credentials. */
export const taskReviewSchema = z.strictObject({
  ...taskEnvelope("task_review"),
  phase: taskPhaseSelectionSchema,
  project: taskProjectSchema,
  policy: taskCompilationPolicySchema,
});
export type TaskReview = z.infer<typeof taskReviewSchema>;
