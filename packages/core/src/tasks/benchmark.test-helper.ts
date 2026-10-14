import { readFileSync } from "node:fs";
import { vi } from "vitest";
import { taskContentHash } from "./canonical.js";
import { TASK_BENCHMARK_FIXTURE_IDS } from "./benchmark-fixture.js";
import {
  TASK_BENCHMARK_PROTOCOL_REVISION,
  type TaskBenchmarkCampaign,
  type TaskBenchmarkRequest,
  type TaskBenchmarkTrial,
} from "./benchmark-report.js";
import {
  type TaskBenchmarkExecutionPorts,
  type TaskBenchmarkEvent,
} from "../executor/task-benchmark.js";
const hash = taskContentHash("offline-coordinator-test");
const strong = {
  adapterId: "openai-responses-v1",
  providerId: "openai-responses-v1" as const,
  modelProfileId: "simulated-strong",
  nativeEffortId: "low",
};
export function campaign(): TaskBenchmarkCampaign {
  return {
    kind: "task_benchmark_campaign",
    schemaVersion: 1,
    protocolRevision: TASK_BENCHMARK_PROTOCOL_REVISION,
    provenance: "offline",
    sourceRevision: hash,
    runnerRevision: hash,
    host: { platform: "darwin", architecture: "arm64", nodeVersion: "v24.21.0" },
    supportRevision: hash,
    modelCatalogRevision: hash,
    pricingRevision: hash,
    routingPolicyRevision: hash,
    productionQualificationEvidence: null,
    strongConfiguration: strong,
    fixtures: TASK_BENCHMARK_FIXTURE_IDS.map((id) =>
      JSON.parse(
        readFileSync(
          new URL(`../../../../tests/tasks/fixtures/${id}/manifest.json`, import.meta.url),
          "utf8",
        ),
      ),
    ),
    trials: [],
  };
}
function request(id: string, purpose: TaskBenchmarkRequest["purpose"]): TaskBenchmarkRequest {
  return {
    requestHash: taskContentHash(id),
    purpose,
    requested: strong,
    effective: { provenance: "unknown" },
    outcome: "completed",
    durationMs: 10,
    priceRevision: hash,
    contextBytes: 100,
    estimatedInputTokens: 25,
    inputTokens: { provenance: "reported", value: 30 },
    outputTokens: { provenance: "reported", value: 10 },
    reasoningTokens: { provenance: "reported", value: 5 },
    cachedInputTokens: { provenance: "reported", value: 0 },
    calculatedCostMicrousd: 2,
    chargedCostMicrousd: { provenance: "unknown" },
  };
}
export function fixture() {
  const events: TaskBenchmarkEvent[] = [];
  const compiles: unknown[] = [];
  const ports: TaskBenchmarkExecutionPorts = {
    retain: vi.fn<TaskBenchmarkExecutionPorts["retain"]>(async (e) => {
      events.push(e);
      return { success: true, data: true };
    }),
    prepareBlock: vi.fn<TaskBenchmarkExecutionPorts["prepareBlock"]>(async () => ({
      ready: true,
      setupMs: { whole: 2, fixed: 3, routed: 4 },
      failureCode: null,
    })),
    compile: vi.fn<TaskBenchmarkExecutionPorts["compile"]>(async (d) => ({
      compilationId: taskContentHash(`${d.fixture.fixtureId}/${d.block}/compile`),
      outcome: "completed",
      planId: hash,
      taskCount: 3,
      elapsedMs: 20,
      requests: [request(`${d.fixture.fixtureId}/${d.block}/compile`, "compile")],
    })),
    runTrial: vi.fn<TaskBenchmarkExecutionPorts["runTrial"]>(async (s) => {
      compiles.push(s.compilation);
      const f = s.fixture;
      const trial: TaskBenchmarkTrial = {
        fixtureId: f.fixtureId,
        fixtureRevision: f.fixtureRevision,
        block: s.block,
        treatment: s.treatment,
        order: s.order,
        authorityHash: taskContentHash({ seedRevision: f.seedRevision, write: f.write }),
        resourceLimitsHash: taskContentHash(f.resourceLimits),
        setupMs: s.treatment === "whole" ? 2 : s.treatment === "fixed" ? 3 : 4,
        executionMs: 30,
        compilation: s.compilation,
        requests: [request(`${f.fixtureId}/${s.block}/${s.treatment}`, "implementation")],
        attemptEvidenceHashes: [hash],
        outcome: "accepted",
        failureCode: null,
        failureStage: null,
        finalEvidenceHash: hash,
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
        publicCriteria: f.requirements.map((r) => ({ criterionId: r.requirementId, passed: true })),
        publicTests: f.publicTestIds.map((testId) => ({ testId, passed: true })),
        holdout: f.testInventory.map((t) => ({ testId: t.testId, passed: true })),
      };
      return trial;
    }),
  };
  return { ports, events, compiles, campaign: campaign() };
}
