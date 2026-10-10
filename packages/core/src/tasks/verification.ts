import { taskContentHash, freezeTaskValue } from "./canonical.js";
import { taskVerificationSchema, type TaskVerificationResult } from "./evidence-schema.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import { TASK_REQUIRED_CHECK_IDS } from "./primitives.js";
import type { TaskPlan } from "./plan-schema.js";
import type { TaskErrorCode } from "./errors.js";
import {
  taskCheckObservationSchema,
  taskVerificationAuditSchema,
  validateTaskVerificationPolicy,
  type TaskVerificationPolicy,
  type TaskCheckObservation,
  type TaskVerificationAudit,
} from "./verification-policy.js";

type Check = TaskVerificationResult["checks"][number];
/** Pure evaluator for executor/reviewer observations. Parsing a serialized result is never acceptance. */
export function evaluateTaskVerification(input: {
  plan: TaskPlan;
  runId: string;
  target: TaskVerificationResult["target"];
  inputRevision: string;
  policy: TaskVerificationPolicy;
  observations: readonly TaskCheckObservation[];
  audit: TaskVerificationAudit;
}): TaskParseResult<TaskVerificationResult> {
  const policy = validateTaskVerificationPolicy(input.policy);
  if (!policy.success) return policy;
  if (policy.data.catalogRevision !== input.plan.checkCatalogRevision)
    return taskFailure(
      "TASK_CHECK_DEFINITION_CHANGED",
      "Plan and reviewed verification catalog differ.",
    );
  const audit = taskVerificationAuditSchema.safeParse(input.audit);
  const observations = taskCheckObservationSchema.array().max(128).safeParse(input.observations);
  if (
    !audit.success ||
    !observations.success ||
    new Set(observations.data.map((o) => o.checkId)).size !== observations.data.length
  )
    return taskFailure("TASK_CHECK_BLOCKED", "Verification observations or audit are invalid.");
  const target = input.target;
  const task =
    target.type === "task" ? input.plan.tasks.find((t) => t.taskId === target.taskId) : undefined;
  if (
    (input.target.type === "task" && task === undefined) ||
    (input.target.type === "phase" && input.target.phaseId !== input.plan.phase.phaseId)
  )
    return taskFailure("TASK_REFERENCE_INVALID", "Verification target is absent from this plan.");
  const criteria =
    task?.criteria.map((c) => ({ ...c })) ??
    input.plan.phaseCriteria.map((c) => ({
      ...c,
      checkIds: [c.checkId],
    }));
  const required = [
    ...new Set([
      ...TASK_REQUIRED_CHECK_IDS.filter((id) => id !== "task.acceptance"),
      ...(task?.requiredCheckIds ?? []),
      input.target.type === "phase" ? "phase.acceptance" : "task.acceptance",
      ...criteria.flatMap((c) => c.checkIds),
    ]),
  ].sort();
  if (observations.data.some((o) => !required.includes(o.checkId)))
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Observation is not applicable to this verification target.",
    );
  const checks: Check[] = [];
  for (const checkId of required) {
    const definition = policy.data.definitions.find((d) => d.checkId === checkId);
    if (definition === undefined)
      return taskFailure(
        "TASK_CHECK_BLOCKED",
        "Required check has no independently reviewed definition.",
      );
    const observation = observations.data.find((o) => o.checkId === checkId);
    const base: Check = {
      checkId,
      definitionRevision: definition.definitionRevision,
      status: definition.authority === "reviewer" ? "needs_review" : "blocked",
      provenance: definition.authority,
      evidenceArtifactIds: [],
      durationMs: 0,
      failureCode: definition.authority === "reviewer" ? "TASK_NEEDS_REVIEW" : "TASK_CHECK_BLOCKED",
      exitCode: null,
      timedOut: false,
      truncated: false,
      discoveredTests: null,
      executedTests: null,
      outputHash: null,
    };
    if (observation !== undefined) {
      Object.assign(base, {
        provenance: observation.provenance,
        durationMs: observation.durationMs,
        exitCode: observation.exitCode,
        timedOut: observation.timedOut,
        truncated: observation.truncated,
        outputHash: observation.outputHash,
      });
      let code: TaskErrorCode | null = null;
      if (observation.definitionRevision !== definition.definitionRevision)
        code = "TASK_CHECK_DEFINITION_CHANGED";
      else if (observation.checkedRevision !== audit.data.beforeRevision)
        code = "TASK_VERIFICATION_STALE";
      else if (
        observation.provenance === "model_claim" ||
        observation.provenance !== definition.authority
      )
        code = "TASK_NEEDS_REVIEW";
      else if (observation.disposition === "unavailable") code = "TASK_PREREQUISITE_MISSING";
      else if (
        observation.disposition === "interrupted" ||
        observation.timedOut ||
        observation.truncated
      )
        code = "TASK_OUTPUT_INCOMPLETE";
      else if (observation.exitCode === null || observation.outputHash === null)
        code = "TASK_OUTPUT_INCOMPLETE";
      else if (observation.exitCode !== 0) code = "TASK_CHECK_FAILED";
      else if (observation.reportStatus === "incomplete") code = "TASK_OUTPUT_INCOMPLETE";
      else if (observation.reportStatus === "invalid") code = "TASK_CHECK_FAILED";
      else if (
        observation.evidenceArtifactIds.some((id) => !definition.evidenceArtifactIds.includes(id))
      )
        code = "TASK_ACCEPTANCE_UNCOVERED";
      if (code === null && checkId === "ts.unit") {
        const tests = observation.testInventory;
        if (tests === null || !tests.complete) code = "TASK_OUTPUT_INCOMPLETE";
        else {
          base.discoveredTests = tests.discovered.length;
          base.executedTests = tests.passed.length + tests.failed.length;
          const sets = [tests.discovered, tests.passed, tests.failed, tests.skipped, tests.todo];
          const executed = [...tests.passed, ...tests.failed, ...tests.skipped, ...tests.todo];
          if (
            sets.some((s) => new Set(s).size !== s.length) ||
            new Set(executed).size !== executed.length ||
            executed.length !== tests.discovered.length ||
            executed.some((id) => !tests.discovered.includes(id))
          )
            code = "TASK_OUTPUT_INCOMPLETE";
          else if (tests.discovered.length === 0 || base.executedTests === 0)
            code = "TASK_CHECK_ZERO_TESTS";
          else if (
            tests.focused ||
            tests.failed.length > 0 ||
            tests.skipped.length > 0 ||
            tests.todo.length > 0 ||
            definition.requiredTestIds.some((id) => !tests.passed.includes(id))
          )
            code = "TASK_CHECK_FAILED";
        }
      }
      base.failureCode = code;
      base.status =
        code === null
          ? "pass"
          : code === "TASK_PREREQUISITE_MISSING" ||
              code === "TASK_OUTPUT_INCOMPLETE" ||
              code === "TASK_CHECK_DEFINITION_CHANGED"
            ? "blocked"
            : code === "TASK_NEEDS_REVIEW" || code === "TASK_ACCEPTANCE_UNCOVERED"
              ? "needs_review"
              : "fail";
      if (code === null) base.evidenceArtifactIds = [...observation.evidenceArtifactIds];
    }
    checks.push(base);
  }
  const criterionCoverage = criteria.map((c) => {
    const bound = c.checkIds.map((id) => ({
      check: checks.find((check) => check.checkId === id),
      definition: policy.data.definitions.find((d) => d.checkId === id),
    }));
    const evidenceArtifactIds = [
      ...new Set(bound.flatMap((b) => b.check?.evidenceArtifactIds ?? [])),
    ].sort();
    return {
      criterionId: c.criterionId,
      checkIds: [...c.checkIds].sort(),
      evidenceArtifactIds,
      satisfied: bound.every(
        (b) =>
          b.check?.status === "pass" &&
          b.definition?.criterionIds.includes(c.criterionId) &&
          b.check.evidenceArtifactIds.length > 0 &&
          (c.evidenceKind !== "reviewer_evidence" || b.check.provenance === "reviewer"),
      ),
    };
  });
  const stale =
    !audit.data.immutableInputsConfirmed ||
    audit.data.beforeRevision !== audit.data.afterRevision ||
    audit.data.beforeRevision !== audit.data.currentRevision;
  const outcome =
    audit.data.unexpectedChanges.length > 0 || stale || checks.some((c) => c.status === "fail")
      ? "fail"
      : !audit.data.complete || checks.some((c) => c.status === "blocked")
        ? "blocked"
        : checks.some((c) => c.status === "needs_review") ||
            criterionCoverage.some((c) => !c.satisfied)
          ? "needs_review"
          : "pass";
  if (outcome !== "pass") for (const c of criterionCoverage) c.satisfied = false;
  const payload = {
    kind: "task_verification_result" as const,
    schemaVersion: 1 as const,
    planId: input.plan.planId,
    runId: input.runId,
    target: input.target,
    checkedRevision: audit.data.beforeRevision,
    inputRevision: input.inputRevision,
    checkCatalogRevision: policy.data.catalogRevision,
    outcome,
    checks,
    criterionCoverage,
    unexpectedChanges: audit.data.unexpectedChanges,
    startedAt: audit.data.startedAt,
    finishedAt: audit.data.finishedAt,
    durationMs: audit.data.durationMs,
  };
  const result = taskVerificationSchema.safeParse({
    ...payload,
    verificationId: taskContentHash(payload),
  });
  if (!result.success || Date.parse(audit.data.finishedAt) < Date.parse(audit.data.startedAt))
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Verification result identities or timing are invalid.",
    );
  return { success: true, data: freezeTaskValue(result.data) };
}
