import { describe, it, expect } from "vitest";
import { compileTaskPlan } from "./compile.js";
import { taskContentHash } from "./canonical.js";
import { sealTaskCompilationCheckpoint } from "./compilation-state.js";
import { taskBenchmarkRequestSchema, summarizeTaskBenchmarkRequests } from "./benchmark-report.js";
import { projectTaskBenchmarkCompilation } from "./benchmark-ledger-projection.js";
import { makeCompilation, HASH, CONFIGURATION, LIMITS, USAGE } from "./fixtures.test-helper.js";
function fixture() {
  const input = makeCompilation(),
    compiled = compileTaskPlan(input);
  if (!compiled.success) throw new Error(compiled.error.code);
  const reservation = {
    calls: 1 as const,
    inputTokens: 1000,
    outputTokens: 100,
    costMicrousd: 1000,
  };
  const payload = {
    kind: "task_compilation_checkpoint" as const,
    schemaVersion: 1 as const,
    compilationId: taskContentHash("original-allowance"),
    stateRevision: 2,
    reviewHash: HASH,
    rootInstance: HASH,
    contextId: HASH,
    requestHash: HASH,
    requestedConfiguration: CONFIGURATION,
    effectiveConfiguration: { provenance: "unknown" as const },
    limits: LIMITS,
    reservation,
    status: "completed" as const,
    plan: compiled.data,
    usage: {
      ...USAGE,
      durationMs: 5,
      reserved: reservation,
      priceCatalogRevision: HASH,
      inputTokens: { provenance: "reported" as const, value: 40 },
      outputTokens: { provenance: "reported" as const, value: 20 },
      cachedInputTokens: { provenance: "reported" as const, value: 10 },
      reasoningTokens: { provenance: "reported" as const, value: 5 },
      costMicrousd: { provenance: "estimated" as const, value: 7 },
    },
    requestFootprint: {
      kind: "task_request_footprint" as const,
      schemaVersion: 1 as const,
      inputDocumentHash: HASH,
      inputDocumentBytes: 320,
      preparedPayloadBytes: 600,
      priceCatalogRevision: HASH,
    },
  };
  return { payload, checkpoint: sealTaskCompilationCheckpoint(payload) };
}
function project(checkpoint: unknown, elapsedMs = 10) {
  const r = projectTaskBenchmarkCompilation({ checkpoint, elapsedMs });
  if (!r.success) throw new Error(r.error.code);
  return r.data;
}
describe("actual ledger projection into campaign request accounting", () => {
  it("preserves original source identity, exact document size, observed token subsets and estimated cost", () => {
    const f = fixture(),
      result = project(f.checkpoint),
      request = result.requests[0]!;
    expect(result).toMatchObject({
      compilationId: f.checkpoint.compilationId,
      planId: f.checkpoint.plan!.planId,
      outcome: "completed",
      taskCount: 2,
      elapsedMs: 10,
    });
    expect(request).toMatchObject({
      purpose: "compile",
      sourceCheckpointHash: f.checkpoint.checkpointHash,
      contextBytes: 320,
      estimatedInputTokens: null,
      calculatedCostMicrousd: 7,
      chargedCostMicrousd: { provenance: "unknown" },
      reservation: f.checkpoint.reservation,
      ledgerUsage: f.checkpoint.usage,
    });
    expect(summarizeTaskBenchmarkRequests([request])).toMatchObject({
      providerCalls: 1,
      retainedRequestIntents: 1,
      inputTokens: 40,
      cachedInputTokens: 10,
      outputTokens: 20,
      reasoningTokens: 5,
      calculatedCostMicrousd: 7,
      chargedCostMicrousd: null,
    });
    expect(Object.isFrozen(request.ledgerUsage)).toBe(true);
  });
  it("retains pending calls as unknown dispatch/duration/usage while preserving held allowance and measured host time", () => {
    const f = fixture(),
      pending = sealTaskCompilationCheckpoint({
        ...f.payload,
        stateRevision: 1,
        status: "pending",
        usage: null,
        plan: null,
      });
    const result = project(pending),
      r = result.requests[0]!;
    expect(result).toMatchObject({ outcome: "failed", taskCount: 0, planId: null, elapsedMs: 10 });
    expect(r).toMatchObject({
      outcome: "pending",
      durationMs: null,
      ledgerUsage: null,
      inputTokens: { provenance: "unknown" },
      reservation: f.payload.reservation,
    });
    expect(summarizeTaskBenchmarkRequests([r])).toMatchObject({
      providerCalls: null,
      retainedRequestIntents: 1,
      uncertainProviderCalls: 1,
      settledRequestIntents: 0,
      requestDurationMs: null,
      inputTokens: null,
      chargedCostMicrousd: null,
    });
  });
  it("keeps old missing footprints as unknown, using only an actually retained pricing revision", () => {
    const f = fixture();
    const { requestFootprint: _new, ...legacy } = f.payload;
    void _new;
    const r = project(sealTaskCompilationCheckpoint(legacy)).requests[0]!;
    expect(r.contextBytes).toBeNull();
    expect(r.priceRevision).toBe(HASH);
    expect(summarizeTaskBenchmarkRequests([r]).contextBytes).toBeNull();
  });
  it("does not relabel synthetic host or estimated usage as provider-reported tokens or actual paid cost", () => {
    const f = fixture(),
      usage = {
        ...f.payload.usage,
        inputTokens: { provenance: "host_reported" as const, value: 40 },
        outputTokens: { provenance: "estimated" as const, value: 20 },
        costMicrousd: { provenance: "host_reported" as const, value: 7 },
      };
    const r = project(sealTaskCompilationCheckpoint({ ...f.payload, usage })).requests[0]!;
    expect(r.inputTokens).toEqual({ provenance: "unknown" });
    expect(r.outputTokens).toEqual({ provenance: "unknown" });
    expect(r.chargedCostMicrousd).toEqual({ provenance: "unknown" });
    expect(r.calculatedCostMicrousd).toBeNull();
    expect(r.ledgerUsage).toEqual(usage);
  });
  it("keeps provider-reported charged cost separate from absent calculated cost", () => {
    const f = fixture(),
      usage = { ...f.payload.usage, costMicrousd: { provenance: "reported" as const, value: 8 } };
    const r = project(sealTaskCompilationCheckpoint({ ...f.payload, usage })).requests[0]!;
    expect(r.chargedCostMicrousd).toEqual({ provenance: "reported", value: 8 });
    expect(r.calculatedCostMicrousd).toBeNull();
  });
  it.each(["refused", "incomplete", "invalid", "failed", "cancelled", "needs_review"] as const)(
    "retains %s source failures without dropping observed usage",
    (status) => {
      const f = fixture(),
        c = sealTaskCompilationCheckpoint({ ...f.payload, status, plan: null });
      const r = project(c);
      expect(r.outcome).toBe("failed");
      expect(r.requests[0]!.outcome).toBe(status);
      expect(r.requests[0]!.ledgerUsage).toEqual(f.payload.usage);
    },
  );
  it.each(["hash", "duration", "negative", "replay", "price"])(
    "rejects %s source accounting corruption",
    (kind) => {
      const f = fixture();
      const changed = structuredClone(f.checkpoint);
      let elapsedMs = 10;
      if (kind === "hash") changed.checkpointHash = taskContentHash("different");
      if (kind === "duration") elapsedMs = 4;
      if (kind === "negative") elapsedMs = -1;
      if (kind === "replay") Object.assign(changed, { benchmarkReplay: {} });
      if (kind === "price") {
        const { checkpointHash: _old, ...payload } = changed;
        void _old;
        payload.requestFootprint!.priceCatalogRevision = taskContentHash("different-price");
        Object.assign(changed, sealTaskCompilationCheckpoint(payload));
      }
      expect(projectTaskBenchmarkCompilation({ checkpoint: changed, elapsedMs })).toMatchObject({
        success: false,
      });
    },
  );
  it("rejects derived metrics that contradict raw ledger facts or invent pending measurements", () => {
    const request = project(fixture().checkpoint).requests[0]!;
    for (const patch of [
      { inputTokens: { provenance: "reported", value: 41 } },
      { chargedCostMicrousd: { provenance: "reported", value: 7 } },
      { calculatedCostMicrousd: 8 },
      { durationMs: 6 },
      { outcome: "pending" },
    ])
      expect(taskBenchmarkRequestSchema.safeParse({ ...request, ...patch }).success).toBe(false);
  });
  it("rejects secret material in a validly rehashed original compilation instead of copying it to a report", () => {
    const f = fixture();
    const c = sealTaskCompilationCheckpoint({
      ...f.payload,
      usage: { ...f.payload.usage, providerCallId: "sk-proj-" + "a".repeat(80) },
    });
    const result = projectTaskBenchmarkCompilation({ checkpoint: c, elapsedMs: 10 });
    expect(result).toMatchObject({ success: false });
    expect(JSON.stringify(result)).not.toContain("sk-proj-");
  });
});
