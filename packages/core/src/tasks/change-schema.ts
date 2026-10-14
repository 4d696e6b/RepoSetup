import * as z from "zod";
import {
  taskAttemptIdSchema,
  taskEnvelope,
  taskHashSchema,
  taskIdSchema,
  taskPathSchema,
  taskTextSchema,
} from "./primitives.js";

export const taskTextChangeSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("create_text"),
    path: taskPathSchema,
    expectedState: z.literal("absent"),
    content: taskTextSchema,
  }),
  z.strictObject({
    type: z.literal("replace_text"),
    path: taskPathSchema,
    expectedFileHash: taskHashSchema,
    oldText: taskTextSchema.refine((text) => text.length > 0),
    newText: taskTextSchema,
  }),
]);
export const taskChangeSetSchema = z.strictObject({
  ...taskEnvelope("change_set"),
  changeSetId: taskHashSchema,
  planId: taskHashSchema,
  taskId: taskIdSchema,
  attemptId: taskAttemptIdSchema,
  inputRevision: taskHashSchema,
  changes: z.array(taskTextChangeSchema).min(1).max(20),
});
export type TaskChangeSet = z.infer<typeof taskChangeSetSchema>;
