import { canonicalTaskValue, freezeTaskValue, taskContentHash } from "./canonical.js";
import { parseTaskDocument, taskFailure, type TaskParseResult } from "./parse.js";
import { taskHandoffSchema, type TaskPacket } from "./handoff-schema.js";
import { taskPreferencesSchema, type TaskPreferences } from "./preferences-schema.js";
import { taskRunIdSchema, taskPositiveCounterSchema } from "./primitives.js";
import { taskByteHash, TASK_CONTEXT_LIMITS } from "./context-text.js";
import { taskContainsPrivateMaterial } from "./portable-input.js";
import type { TaskPlan } from "./plan-schema.js";
import type { TaskMaterializedContext } from "./context-types.js";

export const DEFAULT_HANDOFF_PREFERENCES: TaskPreferences = freezeTaskValue(
  taskPreferencesSchema.parse({
    kind: "task_preferences",
    schemaVersion: 1,
    executionMode: "handoff",
    qualityPreference: "conservative",
    supportProfileId: "managed-ts-node-v1",
    providerAvailability: [],
    effortPreference: { type: "minimum_supported" },
    resourceLimits: {
      maxImplementationAttemptsPerTask: 3,
      maxProviderCalls: 1,
      maxInputTokens: 262144,
      maxOutputTokens: 16384,
      maxWallTimeMs: 120000,
      maxCostMicrousd: 1,
    },
    exclusions: [],
  }),
);
export function inspectPortableTasks(plan: TaskPlan) {
  return plan.orderedTaskIds.map((taskId) => ({
    taskId,
    eligibility: plan.dependencies.some((edge) => edge.consumerTaskId === taskId)
      ? ("blocked_on_predecessors" as const)
      : ("candidate" as const),
    requiredPredecessorIds: plan.dependencies
      .filter((edge) => edge.consumerTaskId === taskId)
      .map((edge) => edge.predecessorTaskId),
    attempts: "not_recorded" as const,
    verification: "not_checked" as const,
  }));
}
export function selectPortableTask(plan: TaskPlan, requested?: string): TaskParseResult<string> {
  const tasks = inspectPortableTasks(plan);
  const task =
    requested === undefined
      ? tasks.find((item) => item.eligibility === "candidate")
      : tasks.find((item) => item.taskId === requested);
  if (task === undefined)
    return taskFailure(
      "TASK_REFERENCE_INVALID",
      "No matching independently executable task exists.",
    );
  if (task.eligibility !== "candidate")
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Predecessor acceptance is unavailable until trusted verification and state are implemented.",
    );
  return { success: true, data: task.taskId };
}
/** Build an advisory dispatch packet; this does not open/advance an execution attempt or durable run. */
export function createPortableHandoff(input: {
  plan: TaskPlan;
  materialized: TaskMaterializedContext;
  taskId: string;
  runId: string;
  attemptNumber: number;
  preferences: TaskPreferences;
}): TaskParseResult<{ handoff: TaskPacket; context: TaskMaterializedContext }> {
  const runId = taskRunIdSchema.safeParse(input.runId);
  const attempt = taskPositiveCounterSchema.safeParse(input.attemptNumber);
  const prefs = taskPreferencesSchema.safeParse(input.preferences);
  if (
    !runId.success ||
    !attempt.success ||
    !prefs.success ||
    input.attemptNumber > prefs.data.resourceLimits.maxImplementationAttemptsPerTask
  )
    return taskFailure(
      "TASK_SELECTION_INVALID",
      "Provide a valid advisory run UUID and attempt number within the reviewed ceiling.",
    );
  if (prefs.data.executionMode !== "handoff")
    return taskFailure(
      "TASK_PROVIDER_UNAVAILABLE",
      "Managed execution is not implemented; choose portable handoff preferences.",
    );
  const selected = selectPortableTask(input.plan, input.taskId);
  if (!selected.success) return selected;
  const task = input.plan.tasks.find((item) => item.taskId === input.taskId)!;
  const parsedContext = parseTaskDocument(input.materialized.context);
  if (!parsedContext.success || parsedContext.data.kind !== "task_context")
    return taskFailure("TASK_CONTEXT_STALE", "Portable context identity is invalid.");
  const sourcePaths = input.materialized.context.sources.map((source) => source.path);
  const filePaths = input.materialized.files.map((file) => file.path);
  if (
    new Set(sourcePaths).size !== sourcePaths.length ||
    new Set(filePaths).size !== filePaths.length ||
    sourcePaths.length !== filePaths.length ||
    input.materialized.files.some(
      (file) =>
        taskByteHash(file.text) !==
        input.materialized.context.sources.find((source) => source.path === file.path)
          ?.selectionHash,
    )
  )
    return taskFailure(
      "TASK_CONTEXT_STALE",
      "Portable source bodies differ from the selected context metadata.",
    );
  if (
    input.materialized.context.planId !== input.plan.planId ||
    input.materialized.context.taskId !== task.taskId
  )
    return taskFailure(
      "TASK_CONTEXT_STALE",
      "Portable context differs from the requested plan/task.",
    );
  const payload = canonicalTaskValue({
    kind: "task_handoff",
    schemaVersion: 1,
    planId: input.plan.planId,
    runId: runId.data,
    taskId: task.taskId,
    attemptId: `${runId.data}/${task.taskId}/${input.attemptNumber}`,
    contextId: input.materialized.context.contextId,
    inputRevision: input.materialized.context.inputRevision,
    objective: task.objective,
    requirementIds: task.requirementIds,
    requirements: input.plan.requirements.filter((item) =>
      task.requirementIds.includes(item.requirementId),
    ),
    constraints: task.constraints,
    scope: task.scope,
    criteria: task.criteria,
    requiredCheckIds: task.requiredCheckIds,
    outputs: task.outputs,
    capabilityRequirements: task.capabilityRequirements,
    effortPreference: prefs.data.effortPreference,
    acceptedPredecessorArtifacts: input.materialized.context.predecessorArtifacts,
    recommendedRouting: null,
    resourceLimits: prefs.data.resourceLimits,
    enforcement: {
      routing: "advisory",
      scope: "advisory",
      budgets: "advisory",
      verification: "unconfirmed",
    },
    unresolvedReferences: input.materialized.context.unresolvedReferences,
  }) as Omit<TaskPacket, "handoffId">;
  if (taskContainsPrivateMaterial(payload) || taskContainsPrivateMaterial(input.materialized))
    return taskFailure("TASK_SCOPE_VIOLATION", "Portable metadata failed privacy screening.");
  const parsed = taskHandoffSchema.safeParse({ ...payload, handoffId: taskContentHash(payload) });
  if (!parsed.success)
    return taskFailure("TASK_PLAN_INVALID", "Portable packet does not match the handoff contract.");
  const data = { handoff: parsed.data, context: input.materialized };
  if (Buffer.byteLength(JSON.stringify(data)) > TASK_CONTEXT_LIMITS.maxContextBytes)
    return taskFailure(
      "TASK_CONTEXT_LIMIT_EXCEEDED",
      "Complete handoff with context exceeds the encoded packet limit.",
    );
  return { success: true, data: freezeTaskValue(data) };
}
