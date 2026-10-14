import * as z from "zod";
import { taskAttemptIdSchema, taskHashSchema, taskIdSchema } from "./primitives.js";
import { executionAttemptSchema, type ExecutionAttempt } from "./run-schema.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskRepairAction } from "./failure.js";
import { taskVerificationSchema } from "./evidence-schema.js";
import type { TaskMaterializedContext } from "./context-types.js";

/** Safe metadata only. Logs, verifier oracle bodies and model completion claims are excluded. */
export const taskRepairContextSchema = z.strictObject({
  kind: z.literal("task_repair_context"),
  schemaVersion: z.literal(1),
  repairId: taskHashSchema,
  previousAttemptId: taskAttemptIdSchema,
  taskId: taskIdSchema,
  contextId: taskHashSchema,
  inputRevision: taskHashSchema,
  action: z.enum(["repair_implementation", "increase_output"]),
  failure: executionAttemptSchema.shape.failure.unwrap(),
  checks: taskVerificationSchema.shape.checks,
  unsatisfiedCriterionIds: z.array(taskIdSchema).max(128),
  retainedEffects: executionAttemptSchema.shape.application.shape.effects,
});
export type TaskRepairContext = z.infer<typeof taskRepairContextSchema>;
export function buildTaskRepairContext(
  previous: ExecutionAttempt,
  packet: Pick<TaskMaterializedContext, "context" | "writeTargets">,
): TaskParseResult<TaskRepairContext> {
  const action = taskRepairAction(previous);
  if (
    !action ||
    !previous.failure ||
    previous.taskId !== packet.context.taskId ||
    previous.planId !== packet.context.planId
  )
    return taskFailure(
      "TASK_NEEDS_REVIEW",
      "Failure evidence is not eligible for automatic targeted repair.",
    );
  if (
    previous.application.effects.some(
      (e) => packet.writeTargets.find((p) => p.path === e.path)?.fileHash !== e.afterHash,
    )
  )
    return taskFailure(
      "TASK_PROJECT_DRIFT",
      "Retained failed edits differ from current owned preimages.",
    );
  const payload = {
    kind: "task_repair_context" as const,
    schemaVersion: 1 as const,
    previousAttemptId: previous.attemptId,
    taskId: previous.taskId,
    contextId: packet.context.contextId,
    inputRevision: packet.context.inputRevision,
    action,
    failure: previous.failure,
    checks: previous.verification?.checks ?? [],
    unsatisfiedCriterionIds:
      previous.verification?.criterionCoverage
        .filter((c) => !c.satisfied)
        .map((c) => c.criterionId) ?? [],
    retainedEffects: previous.application.effects,
  };
  const result = taskRepairContextSchema.safeParse({
    ...payload,
    repairId: taskContentHash(payload),
  });
  if (!result.success || Buffer.byteLength(JSON.stringify(result.data)) > 32768)
    return taskFailure(
      "TASK_CONTEXT_LIMIT_EXCEEDED",
      "Failure-specific repair metadata exceeds its 32768-byte bound.",
    );
  return { success: true, data: freezeTaskValue(result.data) };
}
