import { describe, expect, it } from "vitest";
import { routeTask, taskRemainingAllowance, type TaskRoutingInput } from "./routing.js";
import {
  sealTaskModelCatalog,
  validateTaskModelCatalog,
  type TaskModelProfile,
} from "./model-catalog.js";
import { taskContentHash } from "./canonical.js";
import { makeTask, HASH, LIMITS, USAGE } from "./fixtures.test-helper.js";

function fixture(): TaskRoutingInput {
  const profile = (profileId: string, strong: boolean, price: number): TaskModelProfile => ({
    profileId,
    adapterId: "openai-responses-v1",
    providerId: "openai-responses-v1",
    available: true,
    reviewedAt: "2026-10-07T00:00:00.000Z",
    validUntil: "2026-11-07T00:00:00.000Z",
    qualification: {
      status: "qualified",
      scope: "offline",
      evidenceHash: HASH,
      capabilityClass: strong ? "strong" : "baseline",
      features: ["local_logic", "mechanical_edit"],
    },
    efforts: [
      { nativeEffortId: "low", minimumOutputTokens: 512 },
      { nativeEffortId: "high", minimumOutputTokens: 1024 },
    ],
    maxContextTokens: 50000,
    maxOutputTokens: 16384,
    price: { catalogRevision: HASH, inputMicrousdPerToken: price, outputMicrousdPerToken: price },
  });
  const context = {
    kind: "task_context" as const,
    schemaVersion: 1 as const,
    planId: HASH,
    taskId: "producer",
    inputRevision: HASH,
    sources: [],
    rules: [],
    predecessorArtifacts: [],
    size: { bytes: 100, estimatedInputTokens: 100, estimatorId: "fixture" },
    unresolvedReferences: [],
  };
  return {
    task: makeTask("producer", "req-one", "src/a.ts"),
    planId: HASH,
    context: { ...context, contextId: taskContentHash(context) },
    catalog: sealTaskModelCatalog({
      kind: "task_model_catalog",
      schemaVersion: 1,
      profiles: [profile("cheap", false, 0.1), profile("strong", true, 1)],
    }),
    preferences: {
      kind: "task_preferences",
      schemaVersion: 1,
      executionMode: "managed",
      qualityPreference: "balanced",
      supportProfileId: "managed-ts-node-v1",
      providerAvailability: [
        { providerId: "openai-responses-v1", enabled: true, modelProfileIds: ["cheap", "strong"] },
      ],
      effortPreference: { type: "minimum_supported" },
      resourceLimits: LIMITS,
      exclusions: [],
    },
    qualificationScope: "offline",
    now: "2026-10-07T12:00:00.000Z",
    allowProviderUsage: true,
    maxOutputTokens: 4096,
    remaining: {
      calls: 3,
      inputTokens: 100000,
      outputTokens: 20000,
      costMicrousd: 1000000,
      wallTimeMs: 1000,
    },
  };
}
function selected(input: TaskRoutingInput) {
  const result = routeTask(input);
  if (!result.success) throw new Error(`${result.error.code}: ${result.error.message}`);
  expect(result.data.routingId).toBe(
    taskContentHash(
      Object.fromEntries(Object.entries(result.data).filter(([key]) => key !== "routingId")),
    ),
  );
  return result.data;
}
describe("qualified model routing", () => {
  it("selects cost only after independent capability/effort filters and never invents effective values", () => {
    const f = fixture();
    expect(selected(f).selected).toMatchObject({
      modelProfileId: "cheap",
      nativeEffortId: "low",
      effectiveConfiguration: { provenance: "unknown" },
    });
    f.task.capabilityRequirements.minimumCapabilityClass = "strong";
    f.preferences.effortPreference = { type: "explicit", nativeEffortId: "high" };
    const r = selected(f);
    expect(r.selected).toMatchObject({ modelProfileId: "strong", nativeEffortId: "high" });
    expect(r.rejectedCandidates[0]!.reasons).toContain("missing_capabilities");
  });
  it("does not turn maximum effort into a higher capability class", () => {
    const f = fixture();
    f.task.capabilityRequirements.features = ["security_sensitive"];
    f.preferences.effortPreference = { type: "explicit", nativeEffortId: "high" };
    expect(routeTask(f)).toMatchObject({
      success: false,
      error: { code: "TASK_CAPABILITY_UNAVAILABLE" },
    });
  });
  it("raises conservative quality to the strong floor and preserves stable ties", () => {
    const f = fixture();
    f.preferences.qualityPreference = "conservative";
    expect(selected(f).selected.modelProfileId).toBe("strong");
    const profiles = structuredClone(f.catalog.profiles);
    profiles[0]!.qualification = profiles[1]!.qualification;
    profiles[0]!.price = profiles[1]!.price;
    f.catalog = sealTaskModelCatalog({ kind: "task_model_catalog", schemaVersion: 1, profiles });
    expect(selected(f).selected.modelProfileId).toBe("cheap");
  });
  it.each(["offline", "live"] as const)(
    "never accepts an unconfirmed profile in %s mode",
    (scope) => {
      const f = fixture();
      f.qualificationScope = scope;
      f.catalog = sealTaskModelCatalog({
        kind: "task_model_catalog",
        schemaVersion: 1,
        profiles: f.catalog.profiles.map((p) => ({
          ...p,
          qualification: { status: "unconfirmed" },
        })),
      });
      expect(routeTask(f)).toMatchObject({
        success: false,
        error: {
          details: {
            rejectedCandidates: expect.arrayContaining([
              expect.objectContaining({ reasons: expect.arrayContaining(["model_unqualified"]) }),
            ]),
          },
        },
      });
    },
  );
  it("cannot use offline fixture qualification for live routing", () => {
    const f = fixture();
    f.qualificationScope = "live";
    expect(routeTask(f)).toMatchObject({
      success: false,
      error: { code: "TASK_CAPABILITY_UNAVAILABLE" },
    });
  });
  it.each(["2026-10-06T12:00:00.000Z", "2026-11-07T00:00:00.000Z"])(
    "blocks profiles outside their dated qualification at %s",
    (now) => {
      const f = fixture();
      f.now = now;
      expect(routeTask(f)).toMatchObject({
        success: false,
        error: {
          details: {
            rejectedCandidates: expect.arrayContaining([
              expect.objectContaining({
                reasons: expect.arrayContaining(["qualification_expired"]),
              }),
            ]),
          },
        },
      });
    },
  );
  it("does not silently replace an unsupported explicit effort", () => {
    const f = fixture();
    f.preferences.effortPreference = { type: "explicit", nativeEffortId: "max" };
    expect(routeTask(f)).toMatchObject({
      success: false,
      error: {
        details: {
          rejectedCandidates: expect.arrayContaining([
            expect.objectContaining({
              nativeEffortId: "max",
              reasons: expect.arrayContaining(["unsupported_effort"]),
            }),
          ]),
        },
      },
    });
  });
  it("checks provider preference and model availability separately", () => {
    const f = fixture();
    f.preferences.providerAvailability[0]!.modelProfileIds = ["cheap"];
    const profiles = structuredClone(f.catalog.profiles);
    profiles[0]!.available = false;
    f.catalog = sealTaskModelCatalog({ kind: "task_model_catalog", schemaVersion: 1, profiles });
    expect(routeTask(f)).toMatchObject({
      success: false,
      error: {
        details: {
          rejectedCandidates: expect.arrayContaining([
            expect.objectContaining({ reasons: expect.arrayContaining(["model_unavailable"]) }),
          ]),
        },
      },
    });
  });
  it.each(["calls", "inputTokens", "outputTokens", "costMicrousd", "wallTimeMs"] as const)(
    "blocks exhausted %s before dispatch",
    (key) => {
      const f = fixture();
      f.remaining[key] = 0;
      expect(routeTask(f)).toMatchObject({
        success: false,
        error: { code: "TASK_BUDGET_EXHAUSTED" },
      });
    },
  );
  it("requires usage authority even when a finite allowance exists", () => {
    const f = fixture();
    f.allowProviderUsage = false;
    expect(routeTask(f)).toMatchObject({
      success: false,
      error: { code: "TASK_PROVIDER_ALLOWANCE_REQUIRED" },
    });
  });
  it("filters context and output capacity independently", () => {
    const f = fixture();
    f.catalog = sealTaskModelCatalog({
      kind: "task_model_catalog",
      schemaVersion: 1,
      profiles: f.catalog.profiles.map((p) => ({
        ...p,
        maxContextTokens: 100,
        maxOutputTokens: 1024,
      })),
    });
    expect(routeTask(f)).toMatchObject({
      success: false,
      error: {
        details: {
          rejectedCandidates: expect.arrayContaining([
            expect.objectContaining({
              reasons: expect.arrayContaining(["context_capacity", "output_capacity"]),
            }),
          ]),
        },
      },
    });
  });
  it("keeps the first focused repair fixed, then raises capability without inventing effort equivalence", () => {
    const f = fixture();
    f.repair = {
      implementationFailures: 1,
      previousConfiguration: {
        adapterId: "openai-responses-v1",
        providerId: "openai-responses-v1",
        modelProfileId: "cheap",
        nativeEffortId: "high",
      },
    };
    const focused = selected(f);
    expect(focused.selected).toMatchObject({ modelProfileId: "cheap", nativeEffortId: "high" });
    expect(focused.rejectedCandidates.find((p) => p.modelProfileId === "strong")!.reasons).toEqual([
      "repair_configuration_policy",
    ]);
    f.repair.implementationFailures = 2;
    expect(selected(f).selected).toMatchObject({ modelProfileId: "strong", nativeEffortId: "low" });
  });
  it("raises only the model's own native effort after repeated strong-model failure", () => {
    const f = fixture();
    f.repair = {
      implementationFailures: 2,
      previousConfiguration: {
        adapterId: "openai-responses-v1",
        providerId: "openai-responses-v1",
        modelProfileId: "strong",
        nativeEffortId: "low",
      },
    };
    expect(selected(f).selected).toMatchObject({
      modelProfileId: "strong",
      nativeEffortId: "high",
    });
    f.preferences.effortPreference = { type: "explicit", nativeEffortId: "low" };
    expect(selected(f).selected.nativeEffortId).toBe("low");
  });
  it("rejects stale context and tampered/duplicate catalog mappings", () => {
    const f = fixture();
    f.context.contextId = HASH;
    expect(routeTask(f)).toMatchObject({ success: false, error: { code: "TASK_CONTEXT_STALE" } });
    expect(validateTaskModelCatalog({ ...f.catalog, catalogRevision: HASH }).success).toBe(false);
    expect(
      validateTaskModelCatalog(
        sealTaskModelCatalog({
          kind: "task_model_catalog",
          schemaVersion: 1,
          profiles: [f.catalog.profiles[0]!, f.catalog.profiles[0]!],
        }),
      ).success,
    ).toBe(false);
  });
  it("subtracts retained reservations, not attractive reported usage", () => {
    const remaining = taskRemainingAllowance({
      resourceLimits: LIMITS,
      resourceLedger: {
        reservations: [
          {
            reservationId: "call-one",
            attemptId: null,
            calls: 2,
            inputTokens: 100,
            outputTokens: 200,
            costMicrousd: 300,
          },
        ],
        consumed: { ...USAGE, durationMs: 400 },
      },
    });
    expect(remaining).toEqual({
      calls: 22,
      inputTokens: 239900,
      outputTokens: 47800,
      costMicrousd: 9999700,
      wallTimeMs: 1799600,
    });
  });
});
