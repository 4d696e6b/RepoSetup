import type { ExecutionAttempt } from "./run-schema.js";
import type { TaskErrorCode } from "./errors.js";
import type { TaskVerificationResult } from "./evidence-schema.js";

export type TaskFailureClass = NonNullable<ExecutionAttempt["failure"]>["class"];
export function classifyTaskFailure(code: TaskErrorCode): TaskFailureClass {
  if (["TASK_EXECUTION_ABORTED"].includes(code)) return "cancellation";
  if (["TASK_BUDGET_EXHAUSTED", "TASK_ATTEMPT_LIMIT_EXCEEDED"].includes(code)) return "budget";
  if (["TASK_PROJECT_DRIFT", "TASK_UNEXPECTED_CHANGES"].includes(code)) return "project_drift";
  if (
    [
      "TASK_CONTEXT_STALE",
      "TASK_VERIFICATION_STALE",
      "TASK_PLAN_REVISION_STALE",
      "TASK_CHECK_DEFINITION_CHANGED",
    ].includes(code)
  )
    return "stale_context";
  if (["TASK_CONTEXT_UNRESOLVED", "TASK_CONTEXT_LIMIT_EXCEEDED"].includes(code))
    return "missing_context";
  if (code === "TASK_OUTPUT_INCOMPLETE") return "output_incomplete";
  if (code === "TASK_CHECK_FAILED") return "implementation";
  if (
    [
      "TASK_SCOPE_VIOLATION",
      "TASK_OWNERSHIP_CONFLICT",
      "TASK_PROVIDER_OUTPUT_INVALID",
      "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
      "TASK_CHECK_ZERO_TESTS",
      "TASK_CHANGE_PRECONDITION_FAILED",
    ].includes(code)
  )
    return "policy_violation";
  if (
    [
      "TASK_AMBIGUOUS_REQUIREMENT",
      "TASK_NEEDS_REVIEW",
      "TASK_ACCEPTANCE_UNCOVERED",
      "TASK_PHASE_ACCEPTANCE_FAILED",
    ].includes(code)
  )
    return "ambiguity";
  return "infrastructure";
}
/** Verifier report/time failures are infrastructure, not incomplete model output. */
export function classifyTaskVerificationFailure(v: TaskVerificationResult): {
  code: TaskErrorCode;
  class: TaskFailureClass;
} {
  if (v.unexpectedChanges.length)
    return { code: "TASK_UNEXPECTED_CHANGES", class: "project_drift" };
  const failed = v.checks.filter((c) => c.status !== "pass");
  const protectedCheck = failed.find(
    (c) =>
      c.failureCode !== "TASK_CHECK_FAILED" &&
      c.failureCode !== "TASK_NEEDS_REVIEW" &&
      c.failureCode !== "TASK_CHECK_BLOCKED",
  );
  if (protectedCheck?.failureCode)
    return {
      code: protectedCheck.failureCode,
      class:
        protectedCheck.failureCode === "TASK_OUTPUT_INCOMPLETE"
          ? "infrastructure"
          : classifyTaskFailure(protectedCheck.failureCode),
    };
  // Only a real nonzero observation or complete nonzero unit inventory can justify code repair.
  if (
    failed.some(
      (c) =>
        c.failureCode === "TASK_CHECK_FAILED" &&
        !c.timedOut &&
        !c.truncated &&
        c.outputHash !== null &&
        ((c.exitCode ?? 0) > 0 || (c.checkId === "ts.unit" && (c.executedTests ?? 0) > 0)),
    )
  )
    return { code: "TASK_CHECK_FAILED", class: "implementation" };
  return {
    code: v.outcome === "fail" ? "TASK_CHECK_BLOCKED" : "TASK_NEEDS_REVIEW",
    class: v.outcome === "fail" ? "policy_violation" : "ambiguity",
  };
}
export function taskRepairAction(
  a: ExecutionAttempt,
): "repair_implementation" | "increase_output" | null {
  if (
    a.failure?.class === "implementation" &&
    a.status === "failed" &&
    a.application.status === "applied" &&
    a.verification?.outcome === "fail"
  )
    return "repair_implementation";
  if (
    a.failure?.class === "output_incomplete" &&
    a.status === "failed" &&
    a.proposalOutcome === "incomplete" &&
    a.application.status === "not_applied" &&
    a.application.effects.length === 0 &&
    [a.usage.inputTokens, a.usage.outputTokens, a.usage.costMicrousd].every(
      (u) => u.provenance !== "unknown",
    )
  )
    return "increase_output";
  return null;
}
