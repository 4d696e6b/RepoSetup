import * as z from "zod";
import { compileTaskPlan, validateTaskPlan, type TaskCompilationPolicy } from "./compile.js";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskFailure } from "./parse.js";
import { taskPlanSchema, type TaskPlan, type TaskPlanDraft } from "./plan-schema.js";
import { taskCompilationPolicySchema } from "./policy-schema.js";
import { taskReviewSchema } from "./review-schema.js";
import { TASK_DOCUMENT_LIMITS, taskHashSchema } from "./primitives.js";
import { taskContainsPrivateMaterial } from "./portable-input.js";

export const taskBenchmarkDecompositionSchema = z.strictObject({
  kind: z.literal("task_benchmark_decomposition"),
  schemaVersion: z.literal(1),
  recordHash: taskHashSchema,
  decompositionId: taskHashSchema,
  sourcePlan: taskPlanSchema,
  sourcePolicy: taskCompilationPolicySchema,
  /** Host-frozen logical runtime/tool/config/oracle identity, independent of root locations. */
  logicalVerificationRevision: taskHashSchema,
});
export const taskBenchmarkPlanBindingSchema = z.strictObject({
  kind: z.literal("task_benchmark_plan_binding"),
  schemaVersion: z.literal(1),
  bindingId: taskHashSchema,
  decompositionId: taskHashSchema,
  sourcePlanId: taskHashSchema,
  reviewHash: taskHashSchema,
  plan: taskPlanSchema,
});
export type TaskBenchmarkPlanBinding = z.infer<typeof taskBenchmarkPlanBindingSchema>;
export type TaskBenchmarkDecomposition = z.infer<typeof taskBenchmarkDecompositionSchema>;
const invalid = () =>
  taskFailure(
    "TASK_BENCHMARK_INVALID",
    "Frozen decomposition or independently reviewed replay inputs differ.",
  );
function draft(plan: TaskPlan): TaskPlanDraft {
  return {
    kind: "task_plan_draft",
    schemaVersion: 1,
    phaseId: plan.phase.phaseId,
    selectionHash: plan.phase.selectionHash,
    tasks: plan.tasks,
    dependencies: plan.dependencies,
    unresolvedQuestions: plan.unresolvedQuestions,
  };
}
function policyFacts(policy: TaskCompilationPolicy) {
  const { checkCatalogRevision: _rootBinding, ...facts } = policy;
  void _rootBinding;
  const selectors = (items: TaskCompilationPolicy["authority"]["read"]) =>
    [...items].sort((a, b) => {
      const left = `${a.type}:${a.path}`,
        right = `${b.type}:${b.path}`;
      return left < right ? -1 : left > right ? 1 : 0;
    });
  return {
    ...facts,
    authority: {
      ...facts.authority,
      read: selectors(facts.authority.read),
      deny: selectors(facts.authority.deny),
    },
  };
}
function logicalId(
  plan: TaskPlan,
  policy: TaskCompilationPolicy,
  logicalVerificationRevision: string,
) {
  return taskContentHash({
    kind: "task_benchmark_logical_decomposition",
    schemaVersion: 1,
    phase: plan.phase,
    draft: draft(plan),
    policy: policyFacts(policy),
    logicalVerificationRevision,
  });
}
export function validateTaskBenchmarkDecomposition(value: unknown) {
  const parsed = taskBenchmarkDecompositionSchema.safeParse(value);
  if (!parsed.success) return invalid();
  const record = parsed.data,
    { recordHash, ...payload } = record;
  if (
    Buffer.byteLength(JSON.stringify(record)) > TASK_DOCUMENT_LIMITS.bytes ||
    taskContainsPrivateMaterial(record) ||
    record.sourcePlan.tasks.length > 6 ||
    recordHash !== taskContentHash(payload)
  )
    return invalid();
  const source = validateTaskPlan(record.sourcePlan, record.sourcePolicy);
  if (
    !source.success ||
    record.decompositionId !==
      logicalId(source.data, record.sourcePolicy, record.logicalVerificationRevision)
  )
    return invalid();
  return { success: true as const, data: freezeTaskValue(record) };
}
/** Pure freeze only; a hash is not provider/compilation evidence or execution authority. */
export function freezeTaskBenchmarkDecomposition(input: {
  plan: unknown;
  policy: unknown;
  logicalVerificationRevision: unknown;
}) {
  const policy = taskCompilationPolicySchema.safeParse(input.policy),
    verification = taskHashSchema.safeParse(input.logicalVerificationRevision);
  if (!policy.success || !verification.success) return invalid();
  const source = validateTaskPlan(input.plan, policy.data);
  if (!source.success) return invalid();
  const payload = {
    kind: "task_benchmark_decomposition" as const,
    schemaVersion: 1 as const,
    decompositionId: logicalId(source.data, policy.data, verification.data),
    sourcePlan: source.data,
    sourcePolicy: policy.data,
    logicalVerificationRevision: verification.data,
  };
  return validateTaskBenchmarkDecomposition({ ...payload, recordHash: taskContentHash(payload) });
}
/** Pure revalidation against a fresh host review. Never alter a plan's baseline or import acceptance. */
export function replayTaskBenchmarkDecomposition(input: {
  decomposition: unknown;
  review: unknown;
  logicalVerificationRevision: unknown;
}) {
  const frozen = validateTaskBenchmarkDecomposition(input.decomposition),
    review = taskReviewSchema.safeParse(input.review);
  if (
    !frozen.success ||
    !review.success ||
    input.logicalVerificationRevision !== frozen.data.logicalVerificationRevision
  )
    return invalid();
  const record = frozen.data;
  if (
    taskContentHash(review.data.phase) !== taskContentHash(record.sourcePlan.phase) ||
    taskContentHash(policyFacts(review.data.policy)) !==
      taskContentHash(policyFacts(record.sourcePolicy))
  )
    return invalid();
  const bound = compileTaskPlan({
    phase: review.data.phase,
    project: review.data.project,
    policy: review.data.policy,
    draft: draft(record.sourcePlan),
  });
  if (
    !bound.success ||
    logicalId(bound.data, review.data.policy, record.logicalVerificationRevision) !==
      record.decompositionId ||
    taskContainsPrivateMaterial(bound.data)
  )
    return invalid();
  const payload = {
    kind: "task_benchmark_plan_binding" as const,
    schemaVersion: 1 as const,
    decompositionId: record.decompositionId,
    sourcePlanId: record.sourcePlan.planId,
    reviewHash: taskContentHash(review.data),
    plan: bound.data,
  };
  return {
    success: true as const,
    data: freezeTaskValue({ ...payload, bindingId: taskContentHash(payload) }),
  };
}

/** Read-only reconstruction from a fresh review; persisted bindings grant no execution authority. */
export function validateTaskBenchmarkPlanBinding(input: {
  binding: unknown;
  decomposition: unknown;
  review: unknown;
  logicalVerificationRevision: unknown;
}) {
  const binding = taskBenchmarkPlanBindingSchema.safeParse(input.binding);
  if (!binding.success) return invalid();
  const expected = replayTaskBenchmarkDecomposition(input);
  if (!expected.success || taskContentHash(binding.data) !== taskContentHash(expected.data))
    return invalid();
  return expected;
}
