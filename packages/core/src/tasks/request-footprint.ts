import * as z from "zod";
import { taskContentHash, freezeTaskValue } from "./canonical.js";
import { taskCounterSchema, taskHashSchema, TASK_DOCUMENT_LIMITS } from "./primitives.js";
import type { TaskPreparedProviderRequest } from "./provider.js";

/** Exact byte sizes, not token counts or charged cost. No prompt or payload bodies. */
export const taskRequestFootprintSchema = z.strictObject({
  kind: z.literal("task_request_footprint"),
  schemaVersion: z.literal(1),
  inputDocumentHash: taskHashSchema,
  inputDocumentBytes: taskCounterSchema.max(TASK_DOCUMENT_LIMITS.bytes),
  preparedPayloadBytes: taskCounterSchema.max(TASK_DOCUMENT_LIMITS.bytes),
  priceCatalogRevision: taskHashSchema,
});
export type TaskRequestFootprint = z.infer<typeof taskRequestFootprintSchema>;
/** Called by the executor with the exact document supplied to prepare(), before dispatch. */
export function taskRequestFootprint(
  document: object,
  request: TaskPreparedProviderRequest,
): TaskRequestFootprint {
  return freezeTaskValue(
    taskRequestFootprintSchema.parse({
      kind: "task_request_footprint",
      schemaVersion: 1,
      inputDocumentHash: taskContentHash(document),
      inputDocumentBytes: Buffer.byteLength(JSON.stringify(document)),
      preparedPayloadBytes: Buffer.byteLength(request.payload),
      priceCatalogRevision: request.priceCatalogRevision,
    }),
  );
}
