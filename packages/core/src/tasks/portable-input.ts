import * as z from "zod";
import { decodeTaskJson, parseTaskDocument, taskFailure, type TaskParseResult } from "./parse.js";
import { taskPlanSchema, type TaskPlan } from "./plan-schema.js";
import { hasTaskSecretMaterial } from "./context-text.js";
import { taskHashSchema } from "./primitives.js";

/** Compilation receipts are output-version 1 wrappers, separate from schemaVersion 1 domain documents. */
export const taskCompilationReceiptSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal("task_compilation"),
  dryRun: z.boolean(),
  baselineGit: z.literal("not_checked"),
  plan: taskPlanSchema,
  managedCompilationId: taskHashSchema.optional(),
});
export function parsePortablePlanInput(text: string): TaskParseResult<TaskPlan> {
  const decoded = decodeTaskJson(text);
  if (!decoded.success) return decoded;
  const receipt = taskCompilationReceiptSchema.safeParse(decoded.data);
  const parsed = parseTaskDocument(receipt.success ? receipt.data.plan : decoded.data);
  return parsed.success && parsed.data.kind === "task_plan"
    ? { success: true, data: parsed.data }
    : parsed.success
      ? taskFailure("TASK_PLAN_INVALID", "Expected a frozen task plan or compilation receipt.")
      : parsed;
}
/** Scan string values before output. It never echoes the rejected value. */
export function taskContainsPrivateMaterial(value: unknown): boolean {
  if (typeof value === "string") return hasTaskSecretMaterial(value);
  if (Array.isArray(value)) return value.some(taskContainsPrivateMaterial);
  if (value !== null && typeof value === "object")
    return Object.values(value).some(taskContainsPrivateMaterial);
  return false;
}
