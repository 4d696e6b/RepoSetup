import { taskContentHash } from "./canonical.js";
import { sealTaskModelCatalog, type TaskModelProfile } from "./model-catalog.js";
import { sealTaskRoutingEvaluation } from "./routing-evaluation.js";
import { TASK_ROUTING_POLICY_REVISION, type TaskRoutingInput } from "./routing.js";
import { HASH, LIMITS, makeTask } from "./fixtures.test-helper.js";
import type { TaskPreferences } from "./preferences-schema.js";
import type { TaskRoutingEvaluation } from "./routing-evaluation-schema.js";

export function measuredRoutingFixture(): TaskRoutingInput & { evaluation: TaskRoutingEvaluation } {
  const profiles: TaskModelProfile[] = ["cheap", "strong"].map((profileId, i) => ({
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
      capabilityClass: "strong",
      features: ["local_logic"],
    },
    efforts: [
      { nativeEffortId: "low", minimumOutputTokens: 512 },
      { nativeEffortId: "high", minimumOutputTokens: 512 },
    ],
    maxContextTokens: 50000,
    maxOutputTokens: 16384,
    price: { catalogRevision: HASH, inputMicrousdPerToken: i + 1, outputMicrousdPerToken: i + 1 },
  }));
  const task = makeTask("producer", "req-one", "src/a.ts");
  const context = {
    kind: "task_context" as const,
    schemaVersion: 1 as const,
    planId: HASH,
    taskId: task.taskId,
    inputRevision: HASH,
    sources: [],
    rules: [],
    predecessorArtifacts: [],
    size: { bytes: 100, estimatedInputTokens: 100, estimatorId: "fixture" },
    unresolvedReferences: [],
  };
  const candidates: TaskRoutingEvaluation["candidates"] = [
    ["cheap", "low"],
    ["cheap", "high"],
    ["strong", "low"],
  ].map(([modelProfileId, nativeEffortId], i) => {
    const configuration = {
      modelProfileId: modelProfileId!,
      nativeEffortId: nativeEffortId!,
      immutableModelRevision: "frozen-fixture-v1",
      promptRevision: HASH,
      maxInputTokens: 20000,
      maxOutputTokens: 4096,
      timeoutMs: 1000,
    };
    return {
      configurationId: taskContentHash(configuration),
      configuration,
      outcomes: Array.from({ length: 390 }, (_, k) => (i === 0 ? k < 150 : true)),
      cost: {
        expectedTotalMicrousd: [100, 300, 1000][i]!,
        upperTotalMicrousd: [200, 400, 1200][i]!,
        tariffRevision: HASH,
        accountingRevision: HASH,
        allAttemptsAndOverheadIncluded: true,
        bound: { interpretation: "deterministic_cap", assumptionsHash: HASH },
      },
      resources: [
        {
          resourceId: "latency",
          unit: "ms",
          statistic: "p95",
          upper: 100,
          bound: { interpretation: "predictive_upper", assumptionsHash: HASH },
        },
      ],
      confirmation: "not_run",
    };
  });
  const catalog = sealTaskModelCatalog({
    kind: "task_model_catalog",
    schemaVersion: 1,
    profiles: profiles.map((p) => ({
      ...p,
      efforts: p.efforts.map((e) => {
        const c = candidates.find(
          (c) =>
            c.configuration.modelProfileId === p.profileId &&
            c.configuration.nativeEffortId === e.nativeEffortId,
        );
        return { ...e, ...(c ? { configurationId: c.configurationId } : {}) };
      }),
    })),
  });
  const caseIds = Array.from({ length: 390 }, (_, i) => `problem-${i}`);
  const preferences: TaskPreferences = {
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
  };
  const evaluation = sealTaskRoutingEvaluation({
    kind: "task_routing_evaluation",
    schemaVersion: 1,
    catalogRevision: catalog.catalogRevision,
    workflowRevision: TASK_ROUTING_POLICY_REVISION,
    taskHash: taskContentHash(task),
    executionPreferencesHash: taskContentHash(preferences),
    scope: "offline",
    reviewedAt: profiles[0]!.reviewedAt,
    validUntil: profiles[0]!.validUntil,
    protocolHash: HASH,
    populationHash: HASH,
    selectionCasesHash: taskContentHash(caseIds),
    heldOutCasesHash: HASH,
    sampling: "independent_problem_trials",
    metric: "single_completion_test_pass",
    caseIds,
    referenceConfigurationId: candidates[2]!.configurationId,
    quality: { minimumPassRate: 0.6, maximumDegradation: 0.05, familyAlpha: 0.05 },
    horizonRequests: 100,
    horizonBudgetMicrousd: 10000,
    resourceLimits: [{ resourceId: "latency", unit: "ms", statistic: "p95", limit: 1000 }],
    candidates,
  });
  return {
    task,
    planId: HASH,
    context: { ...context, contextId: taskContentHash(context) },
    catalog,
    evaluation,
    timeoutMs: 1000,
    preferences,
    qualificationScope: "offline",
    now: "2026-10-13T00:00:00.000Z",
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
