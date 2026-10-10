import { describe, expect, it } from "vitest";
import { classifyTaskFailure, classifyTaskVerificationFailure } from "./failure.js";
import type { TaskVerificationResult } from "./evidence-schema.js";
import { HASH, RUN } from "./fixtures.test-helper.js";

const verification = (): TaskVerificationResult => ({
  kind: "task_verification_result",
  schemaVersion: 1,
  verificationId: HASH,
  planId: HASH,
  runId: RUN,
  target: { type: "task", taskId: "producer" },
  checkedRevision: HASH,
  inputRevision: HASH,
  checkCatalogRevision: HASH,
  outcome: "fail",
  checks: [
    {
      checkId: "ts.unit",
      definitionRevision: HASH,
      status: "fail",
      provenance: "executor",
      evidenceArtifactIds: [],
      durationMs: 1,
      failureCode: "TASK_CHECK_FAILED",
      exitCode: 1,
      timedOut: false,
      truncated: false,
      discoveredTests: null,
      executedTests: null,
      outputHash: HASH,
    },
  ],
  criterionCoverage: [],
  unexpectedChanges: [],
  startedAt: "2026-10-07T00:00:00.000Z",
  finishedAt: "2026-10-07T00:00:00.001Z",
  durationMs: 1,
});
describe("failure-specific repair policy", () => {
  it("does not classify checks skipped after an observed failure as missing infrastructure", () => {
    const v = verification();
    v.checks.push({
      ...v.checks[0]!,
      checkId: "ts.lint",
      status: "blocked",
      failureCode: "TASK_CHECK_BLOCKED",
      exitCode: null,
      outputHash: null,
    });
    expect(classifyTaskVerificationFailure(v)).toEqual({
      code: "TASK_CHECK_FAILED",
      class: "implementation",
    });
  });
  it.each([
    ["TASK_CONTEXT_UNRESOLVED", "missing_context"],
    ["TASK_CONTEXT_STALE", "stale_context"],
    ["TASK_OUTPUT_INCOMPLETE", "output_incomplete"],
    ["TASK_PROVIDER_FAILED", "infrastructure"],
    ["TASK_SCOPE_VIOLATION", "policy_violation"],
    ["TASK_AMBIGUOUS_REQUIREMENT", "ambiguity"],
    ["TASK_BUDGET_EXHAUSTED", "budget"],
    ["TASK_EXECUTION_ABORTED", "cancellation"],
    ["TASK_PROJECT_DRIFT", "project_drift"],
    ["TASK_CHECK_FAILED", "implementation"],
  ] as const)("classifies %s without assuming a stronger model fixes it", (code, expected) =>
    expect(classifyTaskFailure(code)).toBe(expected),
  );
  it("uses actual nonzero check failure for implementation repair", () =>
    expect(classifyTaskVerificationFailure(verification())).toEqual({
      code: "TASK_CHECK_FAILED",
      class: "implementation",
    }));
  it("does not treat verifier timeout/overflow as incomplete model output", () => {
    const v = verification();
    v.checks[0]!.failureCode = "TASK_OUTPUT_INCOMPLETE";
    v.checks[0]!.timedOut = true;
    expect(classifyTaskVerificationFailure(v)).toEqual({
      code: "TASK_OUTPUT_INCOMPLETE",
      class: "infrastructure",
    });
  });
  it("requires review for invalid exit-zero evidence or zero tests", () => {
    const v = verification();
    v.checks[0]!.exitCode = 0;
    expect(classifyTaskVerificationFailure(v).class).toBe("policy_violation");
    v.checks[0]!.failureCode = "TASK_CHECK_ZERO_TESTS";
    expect(classifyTaskVerificationFailure(v).class).toBe("policy_violation");
  });
  it("prioritizes drift and missing prerequisites over apparent implementation errors", () => {
    const v = verification();
    v.unexpectedChanges = ["src/other.ts"];
    expect(classifyTaskVerificationFailure(v).class).toBe("project_drift");
    v.unexpectedChanges = [];
    v.checks.push({
      ...v.checks[0]!,
      checkId: "ts.lint",
      status: "blocked",
      failureCode: "TASK_PREREQUISITE_MISSING",
      exitCode: null,
    });
    expect(classifyTaskVerificationFailure(v).class).toBe("infrastructure");
  });
});
