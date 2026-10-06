import {
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  type Task,
  type TaskPlanDraft,
  type PhaseSelection,
} from "./index.js";

export const HASH = `sha256:${"a".repeat(64)}`;
export const RUN = "123e4567-e89b-42d3-a456-426614174000";
export const LIMITS = {
  maxImplementationAttemptsPerTask: 3,
  maxProviderCalls: 24,
  maxInputTokens: 240000,
  maxOutputTokens: 48000,
  maxWallTimeMs: 1800000,
  maxCostMicrousd: 10000000,
};
export const CONFIGURATION = {
  adapterId: "openai-responses-v1",
  providerId: "openai-responses-v1" as const,
  modelProfileId: "qualified-strong",
  nativeEffortId: "low",
};
export const USAGE = {
  inputTokens: { provenance: "unknown" as const },
  outputTokens: { provenance: "unknown" as const },
  reasoningTokens: { provenance: "unknown" as const },
  cachedInputTokens: { provenance: "unknown" as const },
  totalTokens: { provenance: "unknown" as const },
  costMicrousd: { provenance: "unknown" as const },
  providerCallId: null,
  durationMs: 0,
  priceCatalogRevision: null,
  reserved: { calls: 0, inputTokens: 0, outputTokens: 0, costMicrousd: 0 },
};
export function makeTask(id: string, requirementId: string, path: string): Task {
  return {
    taskId: id,
    objective: `Implement ${requirementId}`,
    kind: "implementation",
    requirementIds: [requirementId],
    constraints: ["Preserve existing behavior."],
    scope: { read: [{ type: "subtree", path: "src" }], write: [path], deny: [] },
    criteria: [
      {
        criterionId: `${id}-criterion`,
        statement: "Independent behavior checks pass.",
        requirementIds: [requirementId],
        evidenceKind: "trusted_check",
        checkIds: ["ts.unit", "task.acceptance"],
      },
    ],
    requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
    outputs: [
      {
        artifactId: `${id}-output`,
        kind: "file_snapshot",
        paths: [path],
        criterionIds: [`${id}-criterion`],
      },
    ],
    capabilityRequirements: {
      features: ["local_logic"],
      minimumCapabilityClass: "baseline",
      evidenceRefs: [{ type: "requirement", requirementId }],
    },
  };
}
export function makeCompilation() {
  const phase: PhaseSelection = {
    phaseId: "phase-one",
    sourcePath: "docs/phase.md",
    sourceFileHash: HASH,
    lineRange: { start: 1, end: 10 },
    selectionHash: HASH,
    requirements: ["req-one", "req-two"].map((requirementId) => ({
      requirementId,
      text: `Requirement ${requirementId}`,
      sourceRefs: [{ path: "docs/phase.md", fileHash: HASH }],
      phaseCriterionIds: [`${requirementId}-phase`],
    })),
    phaseCriteria: ["req-one", "req-two"].map((id) => ({
      criterionId: `${id}-phase`,
      statement: "Reviewer-controlled phase behavior.",
      evidenceKind: "trusted_check" as const,
      checkId: "phase.acceptance",
    })),
  };
  const draft: TaskPlanDraft = {
    kind: "task_plan_draft",
    schemaVersion: 1,
    phaseId: phase.phaseId,
    selectionHash: HASH,
    tasks: [
      makeTask("producer", "req-one", "src/contracts.ts"),
      makeTask("consumer", "req-two", "src/consumer.ts"),
    ],
    dependencies: [
      {
        predecessorTaskId: "producer",
        consumerTaskId: "consumer",
        requiredArtifactIds: ["producer-output"],
      },
    ],
    unresolvedQuestions: [],
  };
  return {
    phase,
    draft,
    project: { rootIdentity: HASH, baselineCommit: "b".repeat(40), baselineTreeHash: HASH },
    policy: {
      supportProfileId: "managed-ts-node-v1" as const,
      supportProfileRevision: 1,
      checkCatalogRevision: HASH,
      checkIds: [...TASK_CHECK_IDS],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      authority: {
        read: [{ type: "subtree" as const, path: "src" }],
        write: ["src/contracts.ts", "src/consumer.ts"],
        deny: [],
      },
      caseSensitivePaths: true,
    },
  };
}
