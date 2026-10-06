import * as z from "zod";
import { canonicalTaskValue, freezeTaskValue, taskContentHash } from "./canonical.js";
import { orderTaskGraph } from "./graph.js";
import { parseTaskDocument, parseTaskRecord, taskFailure, type TaskParseResult } from "./parse.js";
import {
  taskPhaseSelectionSchema,
  taskPlanDraftSchema,
  taskPlanSchema,
  type Task,
  type TaskPlan,
  type TaskPlanDraft,
} from "./plan-schema.js";
import {
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  taskHashSchema,
  taskPositiveCounterSchema,
  taskProjectSchema,
  taskScopeSchema,
} from "./primitives.js";
import { isTaskPathExcluded, taskCanRead, taskCanWrite, taskSelectorContains } from "./scope.js";

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
type CompileInput = { phase: unknown; draft?: unknown; project: unknown; policy: unknown };

/** Pure compilation only. Host path/range/hash facts must be established by later repository adapters. */
export function compileTaskPlan(input: CompileInput): TaskParseResult<TaskPlan> {
  if (input.draft === undefined)
    return taskFailure("TASK_DECOMPOSITION_REQUIRED", "Provide a reviewed structured task draft.");
  const phase = parseTaskRecord(taskPhaseSelectionSchema, input.phase, "TASK_SELECTION_INVALID");
  if (!phase.success) return phase;
  const draft = parseTaskRecord(taskPlanDraftSchema, input.draft, "TASK_DRAFT_INVALID");
  if (!draft.success) return draft;
  const project = parseTaskRecord(taskProjectSchema, input.project, "TASK_SELECTION_INVALID");
  if (!project.success) return project;
  const policy = parseTaskRecord(
    taskCompilationPolicySchema,
    input.policy,
    "TASK_PROFILE_UNSUPPORTED",
  );
  if (!policy.success) return policy;
  if (
    draft.data.phaseId !== phase.data.phaseId ||
    draft.data.selectionHash !== phase.data.selectionHash
  ) {
    return taskFailure(
      "TASK_PLAN_REVISION_STALE",
      "Draft does not match the selected phase revision.",
    );
  }
  if (
    TASK_CHECK_IDS.some((id) => !policy.data.checkIds.includes(id)) ||
    TASK_REQUIRED_CHECK_IDS.some((id) => !policy.data.requiredCheckIds.includes(id))
  ) {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "The initial profile's trusted check authority is incomplete.",
    );
  }
  const graph = orderTaskGraph(draft.data.tasks, draft.data.dependencies);
  if (!graph.success) return graph;
  const requirements = new Map(phase.data.requirements.map((item) => [item.requirementId, item]));
  const phaseCriteria = new Map(phase.data.phaseCriteria.map((item) => [item.criterionId, item]));
  const taskCriteria = new Set<string>();
  const artifacts = new Map<string, { task: Task; output: Task["outputs"][number] }>();
  if (
    requirements.size !== phase.data.requirements.length ||
    phaseCriteria.size !== phase.data.phaseCriteria.length
  ) {
    return taskFailure("TASK_ID_DUPLICATE", "Requirement and phase criterion IDs must be unique.");
  }
  for (const criterion of phaseCriteria.values()) {
    if (criterion.checkId !== "phase.acceptance")
      return taskFailure(
        "TASK_REFERENCE_INVALID",
        "Phase criteria require independent phase acceptance authority.",
      );
  }
  for (const requirement of requirements.values()) {
    if (requirement.phaseCriterionIds.some((id) => !phaseCriteria.has(id))) {
      return taskFailure(
        "TASK_REFERENCE_INVALID",
        "Requirement refers to an absent phase criterion.",
      );
    }
  }
  if (
    new Set(draft.data.unresolvedQuestions.map((item) => item.questionId)).size !==
    draft.data.unresolvedQuestions.length
  ) {
    return taskFailure("TASK_ID_DUPLICATE", "Question IDs must be unique.");
  }
  for (const question of draft.data.unresolvedQuestions) {
    if (question.requirementIds.some((id) => !requirements.has(id)))
      return taskFailure("TASK_REFERENCE_INVALID", "Question refers to an absent requirement.");
    if (question.blocking)
      return taskFailure(
        "TASK_AMBIGUOUS_REQUIREMENT",
        "Resolve blocking questions before freezing a plan.",
      );
  }
  const owners = new Set<string>();
  const tasks: Task[] = [];
  for (const candidate of draft.data.tasks) {
    const scoped = checkTaskScope(candidate, policy.data, owners);
    if (!scoped.success) return scoped;
    const task = scoped.data;
    if (task.requirementIds.some((id) => !requirements.has(id)))
      return taskFailure("TASK_REFERENCE_INVALID", "Task refers to an absent requirement.");
    if (
      task.requiredCheckIds.some(
        (id) => !policy.data.checkIds.includes(id as (typeof TASK_CHECK_IDS)[number]),
      ) ||
      policy.data.requiredCheckIds.some((id) => !task.requiredCheckIds.includes(id))
    ) {
      return taskFailure(
        "TASK_REFERENCE_INVALID",
        "Task must select the complete trusted profile checks.",
      );
    }
    for (const criterion of task.criteria) {
      if (taskCriteria.has(criterion.criterionId) || phaseCriteria.has(criterion.criterionId))
        return taskFailure("TASK_ID_DUPLICATE", "Criterion IDs must be unique across the plan.");
      taskCriteria.add(criterion.criterionId);
      if (
        criterion.requirementIds.some((id) => !task.requirementIds.includes(id)) ||
        criterion.checkIds.some((id) => !task.requiredCheckIds.includes(id))
      ) {
        return taskFailure(
          "TASK_REFERENCE_INVALID",
          "Task criterion refers to unowned requirements or checks.",
        );
      }
    }
    for (const output of task.outputs) {
      if (artifacts.has(output.artifactId))
        return taskFailure("TASK_ID_DUPLICATE", "Artifact IDs must have a unique producer.");
      if (
        output.criterionIds.some(
          (id) => !task.criteria.some((criterion) => criterion.criterionId === id),
        )
      ) {
        return taskFailure("TASK_ARTIFACT_INVALID", "Output refers to an absent owning criterion.");
      }
      if (
        output.paths.some((path) =>
          output.kind === "file_snapshot" ? !taskCanWrite(task, path) : !taskCanRead(task, path),
        )
      ) {
        return taskFailure(
          "TASK_ARTIFACT_INVALID",
          "Output paths exceed the owning task's permitted scope.",
        );
      }
      artifacts.set(output.artifactId, { task, output });
    }
    for (const ref of task.capabilityRequirements.evidenceRefs) {
      if (
        (ref.type === "requirement" && !task.requirementIds.includes(ref.requirementId)) ||
        (ref.type === "constraint" && ref.index >= task.constraints.length) ||
        (ref.type === "source" && !taskCanRead(scoped.data, ref.source.path))
      ) {
        return taskFailure(
          "TASK_REFERENCE_INVALID",
          "Capability evidence does not belong to the task.",
        );
      }
    }
    const capability = scoped.data.capabilityRequirements;
    if (
      capability.features.some((feature) =>
        ["interface_change", "cross_module", "security_sensitive", "ambiguity_resolution"].includes(
          feature,
        ),
      )
    ) {
      capability.minimumCapabilityClass = "strong";
    }
    tasks.push(scoped.data);
  }
  for (const edge of draft.data.dependencies) {
    if (
      edge.requiredArtifactIds.some(
        (id) => artifacts.get(id)?.task.taskId !== edge.predecessorTaskId,
      )
    ) {
      return taskFailure(
        "TASK_ARTIFACT_INVALID",
        "Dependency artifacts must come from its named predecessor.",
      );
    }
    const consumer = tasks.find((task) => task.taskId === edge.consumerTaskId)!;
    if (
      edge.requiredArtifactIds.some((id) =>
        artifacts.get(id)!.output.paths.some((path) => !taskCanRead(consumer, path)),
      )
    ) {
      return taskFailure(
        "TASK_SCOPE_VIOLATION",
        "Consumer cannot read a required predecessor artifact.",
      );
    }
  }
  const coverage: TaskPlan["coverage"] = [];
  for (const requirement of requirements.values()) {
    const matching = tasks.filter((task) =>
      task.requirementIds.includes(requirement.requirementId),
    );
    const criteria = matching.flatMap((task) =>
      task.criteria.filter((criterion) =>
        criterion.requirementIds.includes(requirement.requirementId),
      ),
    );
    if (matching.length === 0 || criteria.length === 0)
      return taskFailure(
        "TASK_REQUIREMENT_UNCOVERED",
        "Selected requirement lacks task and criterion coverage.",
      );
    if (
      matching.some(
        (task) =>
          !task.criteria.some((criterion) =>
            criterion.requirementIds.includes(requirement.requirementId),
          ),
      )
    ) {
      return taskFailure(
        "TASK_REQUIREMENT_UNCOVERED",
        "Each owning task must evidence each declared requirement.",
      );
    }
    coverage.push({
      requirementId: requirement.requirementId,
      taskIds: matching.map((task) => task.taskId),
      taskCriterionIds: criteria.map((criterion) => criterion.criterionId),
      phaseCriterionIds: requirement.phaseCriterionIds,
      requiredArtifactIds: matching.flatMap((task) =>
        task.outputs
          .filter((output) =>
            output.criterionIds.some((id) =>
              criteria.some((criterion) => criterion.criterionId === id),
            ),
          )
          .map((output) => output.artifactId),
      ),
    });
  }
  const payload = canonicalTaskValue({
    kind: "task_plan",
    schemaVersion: 1,
    phase: phase.data,
    project: project.data,
    supportProfileId: policy.data.supportProfileId,
    supportProfileRevision: policy.data.supportProfileRevision,
    checkCatalogRevision: policy.data.checkCatalogRevision,
    requirements: phase.data.requirements,
    phaseCriteria: phase.data.phaseCriteria,
    tasks,
    dependencies: draft.data.dependencies,
    orderedTaskIds: graph.data,
    coverage,
    unresolvedQuestions: draft.data.unresolvedQuestions,
  }) as Omit<TaskPlan, "planId">;
  const plan = taskPlanSchema.parse({ ...payload, planId: taskContentHash(payload) });
  return { success: true, data: freezeTaskValue(plan) };
}

function checkTaskScope(
  task: Task,
  policy: TaskCompilationPolicy,
  owners: Set<string>,
): TaskParseResult<Task> {
  if (
    [task.scope.read, task.scope.deny].some(
      (selectors) =>
        new Set(selectors.map((item) => `${item.type}/${item.path}`)).size !== selectors.length,
    ) ||
    new Set(task.scope.write).size !== task.scope.write.length
  ) {
    return taskFailure(
      "TASK_SCOPE_INVALID",
      "Scope selectors must be unique and non-contradictory.",
    );
  }
  for (const read of task.scope.read) {
    if (
      isTaskPathExcluded(read.path, "read") ||
      !policy.authority.read.some(
        (allowed) =>
          taskSelectorContains(allowed, read.path) &&
          (read.type === "file" || allowed.type === "subtree"),
      )
    ) {
      return taskFailure(
        "TASK_SCOPE_VIOLATION",
        "Read selectors exceed reviewed compilation authority.",
      );
    }
  }
  const deny = [...task.scope.deny];
  for (const selector of policy.authority.deny) {
    if (!deny.some((item) => item.type === selector.type && item.path === selector.path))
      deny.push(selector);
  }
  const scoped = { ...task, scope: { ...task.scope, deny } };
  for (const path of scoped.scope.write) {
    if (!policy.authority.write.includes(path) || !taskCanWrite(scoped, path)) {
      return taskFailure(
        "TASK_SCOPE_VIOLATION",
        "Write path exceeds reviewed task authority or exclusions.",
      );
    }
    const identity = policy.caseSensitivePaths ? path : path.toLowerCase();
    if (
      [...owners].some(
        (owned) =>
          owned === identity ||
          owned.startsWith(`${identity}/`) ||
          identity.startsWith(`${owned}/`),
      )
    ) {
      return taskFailure(
        "TASK_OWNERSHIP_CONFLICT",
        "Write targets require one unambiguous task owner.",
      );
    }
    owners.add(identity);
  }
  return { success: true, data: scoped };
}

/** Recompute structural coverage/DAG/ownership; a payload hash alone is not validation authority. */
export function validateTaskPlan(input: unknown, policy: unknown): TaskParseResult<TaskPlan> {
  const record = parseTaskDocument(input);
  if (!record.success) return record;
  if (record.data.kind !== "task_plan")
    return taskFailure("TASK_PLAN_INVALID", "Expected a frozen task plan.");
  const plan = record.data;
  const draft: TaskPlanDraft = {
    kind: "task_plan_draft",
    schemaVersion: 1,
    phaseId: plan.phase.phaseId,
    selectionHash: plan.phase.selectionHash,
    tasks: plan.tasks,
    dependencies: plan.dependencies,
    unresolvedQuestions: plan.unresolvedQuestions,
  };
  const compiled = compileTaskPlan({ phase: plan.phase, project: plan.project, draft, policy });
  if (!compiled.success) return compiled;
  return compiled.data.planId === plan.planId
    ? compiled
    : taskFailure("TASK_PLAN_INVALID", "Plan coverage, ordering or policy revision was altered.");
}
