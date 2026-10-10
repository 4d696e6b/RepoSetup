import * as z from "zod";
import {
  qualifiedTaskCheckSchema,
  taskVerificationPolicySchema,
  taskContentHash,
  decodeTaskJson,
  taskFailure,
  type TaskParseResult,
} from "@reposetup/core";
import { readTaskInput } from "./input.js";
import type { ResolvedCliDeps } from "../types.js";

/** Separate, independently reviewed host authority. No commands, hooks, credentials or endpoints. */
export const managedTaskAuthoritySchema = z.strictObject({
  kind: z.literal("task_execution_authority"),
  schemaVersion: z.literal(1),
  checks: z.array(qualifiedTaskCheckSchema).length(3),
  policy: taskVerificationPolicySchema,
});
export type ManagedTaskAuthority = z.infer<typeof managedTaskAuthoritySchema>;
export async function loadManagedTaskAuthority(
  file: string,
  deps: ResolvedCliDeps,
): Promise<TaskParseResult<{ authority: ManagedTaskAuthority; authorityId: string }>> {
  const read = await readTaskInput(file, deps);
  if (!read.success) return read;
  const decoded = decodeTaskJson(read.data);
  if (!decoded.success) return decoded;
  const parsed = managedTaskAuthoritySchema.safeParse(decoded.data);
  return parsed.success
    ? { success: true, data: { authority: parsed.data, authorityId: taskContentHash(parsed.data) } }
    : taskFailure(
        "TASK_CHECK_BLOCKED",
        "Provide separate independently reviewed task_execution_authority with pinned fixed-check bindings; plans and model output are not authority.",
      );
}
