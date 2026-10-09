import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { taskContentHash } from "./canonical.js";
import { TASK_BENCHMARK_FIXTURE_IDS } from "./benchmark-fixture.js";
import {
  benchmarkTreatmentOrder,
  summarizeTaskBenchmark,
  TASK_BENCHMARK_PROTOCOL_REVISION,
  validateTaskBenchmarkCampaign,
  type TaskBenchmarkCampaign,
  type TaskBenchmarkRequest,
} from "./benchmark-report.js";
import { HASH, CONFIGURATION } from "./fixtures.test-helper.js";
function request(id: string, purpose: TaskBenchmarkRequest["purpose"]): TaskBenchmarkRequest {
  return {
    requestHash: taskContentHash(id),
    purpose,
    requested: CONFIGURATION,
    effective: { provenance: "unknown" },
    outcome: "completed",
    durationMs: 10,
    priceRevision: HASH,
    contextBytes: 320,
    estimatedInputTokens: 80,
    inputTokens: { provenance: "reported", value: 100 },
    outputTokens: { provenance: "reported", value: 20 },
    reasoningTokens: { provenance: "reported", value: 5 },
    cachedInputTokens: { provenance: "reported", value: 40 },
    calculatedCostMicrousd: 7,
    chargedCostMicrousd: { provenance: "reported", value: 8 },
  };
}
function campaign(): TaskBenchmarkCampaign {
  const fixtures = TASK_BENCHMARK_FIXTURE_IDS.map((id) =>
    JSON.parse(
      readFileSync(
        new URL(`../../../../tests/tasks/fixtures/${id}/manifest.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
  const c: TaskBenchmarkCampaign = {
    kind: "task_benchmark_campaign",
    schemaVersion: 1,
    protocolRevision: TASK_BENCHMARK_PROTOCOL_REVISION,
    provenance: "offline",
    sourceRevision: HASH,
    runnerRevision: HASH,
    host: { platform: "darwin", architecture: "arm64", nodeVersion: "v24.21.0" },
    supportRevision: HASH,
    modelCatalogRevision: HASH,
    pricingRevision: HASH,
    routingPolicyRevision: HASH,
    productionQualificationEvidence: null,
    strongConfiguration: CONFIGURATION,
    fixtures,
    trials: [],
  };
  for (const f of fixtures)
    for (let block = 0; block < 5; block++)
      for (const treatment of benchmarkTreatmentOrder(block))
        c.trials.push({
          fixtureId: f.fixtureId,
          fixtureRevision: f.fixtureRevision,
          block,
          treatment,
          order: benchmarkTreatmentOrder(block).indexOf(treatment),
          authorityHash: taskContentHash({ seedRevision: f.seedRevision, write: f.write }),
          resourceLimitsHash: taskContentHash(f.resourceLimits),
          setupMs: 5,
          executionMs: 100,
          compilation:
            treatment === "whole"
              ? null
              : {
                  compilationId: taskContentHash(`${f.fixtureId}/${block}/compile`),
                  outcome: "completed",
                  planId: HASH,
                  taskCount: 2,
                  elapsedMs: 50,
                  requests: [request(`${f.fixtureId}/${block}/compile`, "compile")],
                },
          requests: [request(`${f.fixtureId}/${block}/${treatment}`, "implementation")],
          attemptEvidenceHashes: [HASH],
          outcome: "accepted",
          failureCode: null,
          failureStage: null,
          finalEvidenceHash: HASH,
          protectedInputsUnchanged: true,
          forbiddenEffects: 0,
          checks: [
            "ts.typecheck",
            "ts.lint",
            "ts.unit",
            "task.acceptance",
            "phase.acceptance",
            "compatibility",
          ].map((checkId) => ({ checkId: checkId as "ts.unit", passed: true, executedTests: 1 })),
          publicCriteria: f.requirements.map((r: { requirementId: string }) => ({
            criterionId: r.requirementId,
            passed: true,
          })),
          publicTests: f.publicTestIds.map((testId: string) => ({ testId, passed: true })),
          holdout: f.testInventory.map((t: { testId: string }) => ({
            testId: t.testId,
            passed: true,
          })),
        });
  return c;
}
function report(c: TaskBenchmarkCampaign) {
  const result = summarizeTaskBenchmark(c);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
}
describe("inclusive benchmark accounting", () => {
  it("retains independent reviewer coverage without inventing executable test counts", () => {
    const c = campaign();
    for (const t of c.trials)
      for (const check of t.checks) {
        if (["task.acceptance", "phase.acceptance"].includes(check.checkId)) {
          check.executedTests = null;
          check.provenance = "reviewer";
          check.reviewedCriteria = 4;
        }
      }
    expect(validateTaskBenchmarkCampaign(c).success).toBe(true);
    expect(report(c).comparisonQualified).toBe(false);
    const review = c.trials[0]!.checks.find((c) => c.checkId === "task.acceptance")!;
    review.reviewedCriteria = 0;
    expect(validateTaskBenchmarkCampaign(c).success).toBe(false);
    review.reviewedCriteria = 4;
    review.provenance = "executor";
    expect(validateTaskBenchmarkCampaign(c).success).toBe(false);
    delete review.provenance;
    expect(validateTaskBenchmarkCampaign(c).success).toBe(false);
  });
  it("does not replace zero or missing executed unit tests with reviewer coverage", () => {
    const c = campaign();
    const unit = c.trials[0]!.checks.find((c) => c.checkId === "ts.unit")!;
    Object.assign(unit, { executedTests: null, provenance: "reviewer", reviewedCriteria: 4 });
    expect(validateTaskBenchmarkCampaign(c).success).toBe(false);
  });
  it("retains uncertain terminal trials with null request measurements and unknown dispatch count", () => {
    const c = campaign(),
      t = c.trials[0]!;
    t.outcome = "failed";
    t.failureCode = "TASK_PROVIDER_FAILED";
    t.failureStage = "execution";
    const r = t.requests[0]!;
    Object.assign(r, {
      outcome: "pending",
      durationMs: null,
      priceRevision: null,
      contextBytes: null,
      purpose: "unknown",
      ledgerUsage: null,
      calculatedCostMicrousd: null,
      inputTokens: { provenance: "unknown" },
      outputTokens: { provenance: "unknown" },
      cachedInputTokens: { provenance: "unknown" },
      reasoningTokens: { provenance: "unknown" },
      chargedCostMicrousd: { provenance: "unknown" },
    });
    const result = report(c);
    expect(result.complete).toBe(true);
    expect(result.cashLedger).toMatchObject({
      providerCalls: null,
      retainedRequestIntents: 100,
      settledRequestIntents: 99,
      uncertainProviderCalls: 1,
      contextBytes: null,
      requestDurationMs: null,
      inputTokens: null,
      calculatedCostMicrousd: null,
    });
    expect(result.treatments[0]!.requestMetadataComplete).toBe(false);
    expect(result.comparisonQualified).toBe(false);
    t.outcome = "accepted";
    t.failureCode = null;
    t.failureStage = null;
    expect(validateTaskBenchmarkCampaign(c).success).toBe(false);
  });
  it("retains an observed compilation preflight failure with zero intents, without inventing a source call", () => {
    const c = campaign();
    for (const t of c.trials.filter(
      (t) => t.fixtureId === c.fixtures[0]!.fixtureId && t.block === 0 && t.treatment !== "whole",
    )) {
      Object.assign(t.compilation!, {
        outcome: "failed",
        taskCount: 0,
        planId: null,
        requests: [],
      });
      Object.assign(t, {
        outcome: "failed",
        failureCode: "TASK_PREREQUISITE_MISSING",
        failureStage: "compile",
        requests: [],
        attemptEvidenceHashes: [],
      });
    }
    expect(report(c).cashLedger.retainedRequestIntents).toBe(97);
    c.trials[1]!.compilation!.outcome = "completed";
    expect(validateTaskBenchmarkCampaign(c).success).toBe(false);
  });
  it("rotates 75 trials and charges shared compilation twice analytically, once in cash", () => {
    const r = report(campaign());
    expect(r.complete).toBe(true);
    expect(r.comparisonQualified).toBe(false);
    expect(r.treatments.map((t) => t.accepted)).toEqual([25, 25, 25]);
    expect(r.treatments.every((t) => !t.qualified)).toBe(true);
    expect(r.treatments.map((t) => t.resources.providerCalls)).toEqual([25, 50, 50]);
    expect(r.cashLedger.providerCalls).toBe(100);
    expect(r.treatments.map((t) => t.resources.calculatedCostMicrousd)).toEqual([175, 350, 350]);
    expect(r.cashLedger.calculatedCostMicrousd).toBe(700);
    expect(r.treatments.map((t) => t.wallTime.totalMs)).toEqual([2500, 3750, 3750]);
    // Reasoning/output and cached/input subsets are disclosed, never added twice.
    expect(r.cashLedger.outputTokens).toBe(2000);
    expect(r.cashLedger.reasoningTokens).toBe(500);
    expect(r.cashLedger.inputTokens).toBe(10000);
  });
  it("includes failed/blocked trials and reports unknown usage rather than zero", () => {
    const c = campaign();
    const t = c.trials[0]!;
    t.outcome = "failed";
    t.failureCode = "check-failed";
    t.failureStage = "execution";
    t.holdout[0]!.passed = false;
    t.requests[0]!.inputTokens = { provenance: "unknown" };
    t.requests[0]!.calculatedCostMicrousd = null;
    t.requests.push(request("failed-repair", "repair"));
    for (const p of c.trials.filter(
      (p) => p.fixtureId === c.trials[3]!.fixtureId && p.block === 1,
    )) {
      p.outcome = "blocked";
      p.failureCode = "setup-unavailable";
      p.failureStage = "setup";
      p.compilation = null;
      p.requests = [];
      p.attemptEvidenceHashes = [];
    }
    const r = report(c);
    expect(r.treatments[0]!.accepted).toBe(23);
    expect(r.treatments[0]!.failed).toBe(1);
    expect(r.treatments[0]!.blocked).toBe(1);
    expect(r.cashLedger.inputTokens).toBeNull();
    expect(r.treatments[0]!.resources.calculatedCostMicrousd).toBeNull();
    expect(r.cashLedger.providerCalls).toBe(97);
  });
  it("retains failed compilation for both compiled treatments", () => {
    const c = campaign();
    for (const t of c.trials.filter(
      (t) => t.fixtureId === c.fixtures[0]!.fixtureId && t.block === 0 && t.treatment !== "whole",
    )) {
      t.compilation!.outcome = "failed";
      t.compilation!.planId = null;
      t.compilation!.taskCount = 0;
      t.requests = [];
      t.attemptEvidenceHashes = [];
      t.outcome = "failed";
      t.failureCode = "compile-invalid";
      t.failureStage = "compile";
    }
    const r = report(c);
    expect(r.treatments.map((t) => t.accepted)).toEqual([25, 24, 24]);
    expect(r.treatments[1]!.resources.providerCalls).toBe(49);
    expect(r.cashLedger.providerCalls).toBe(98);
  });
  it("shows missing trials and undefined zero-success denominators", () => {
    const c = campaign();
    c.trials = c.trials.slice(0, 1);
    c.trials[0]!.outcome = "failed";
    c.trials[0]!.failureCode = "provider-failed";
    c.trials[0]!.failureStage = "execution";
    const r = report(c);
    expect(r.complete).toBe(false);
    expect(r.missing).toHaveLength(74);
    expect(r.treatments[0]!.calculatedCostPerAcceptedMicrousd).toBeNull();
  });
  it.each([
    "shared-plan",
    "authority",
    "duplicate-request",
    "order",
    "holdout",
    "public-inventory",
    "public-failure",
    "zero-tests",
    "protected-effects",
    "price-token-subset",
    "command",
  ])("rejects %s corruption before aggregation", (kind) => {
    const c = campaign();
    switch (kind) {
      case "shared-plan":
        c.trials[2]!.compilation!.planId = taskContentHash("different");
        break;
      case "authority":
        c.trials[0]!.authorityHash = taskContentHash("broader");
        break;
      case "duplicate-request":
        c.trials[1]!.requests[0]!.requestHash = c.trials[0]!.requests[0]!.requestHash;
        break;
      case "order":
        c.trials[0]!.order = 2;
        break;
      case "holdout":
        c.trials[0]!.holdout = [];
        break;
      case "public-inventory":
        c.trials[0]!.publicTests.pop();
        break;
      case "public-failure":
        c.trials[0]!.publicTests[0]!.passed = false;
        break;
      case "zero-tests":
        c.trials[0]!.checks.find((v) => v.checkId === "ts.unit")!.executedTests = 0;
        break;
      case "protected-effects":
        c.trials[0]!.forbiddenEffects = 1;
        break;
      case "price-token-subset":
        c.trials[0]!.requests[0]!.reasoningTokens = { provenance: "reported", value: 21 };
        break;
      case "command":
        Object.assign(c.trials[0]!, { command: "arbitrary" });
        break;
    }
    expect(validateTaskBenchmarkCampaign(c)).toMatchObject({
      success: false,
      error: { code: "TASK_BENCHMARK_INVALID" },
    });
  });
});
