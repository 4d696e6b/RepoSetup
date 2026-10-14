import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  taskByteHash,
  taskContentHash,
  taskVerificationCatalogHash,
  sealTaskModelCatalog,
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  TASK_ROUTING_POLICY_REVISION,
  type Task,
  type TaskBenchmarkCampaign,
  type TaskBenchmarkFixture,
  type TaskParseResult,
  type TaskPlanDraft,
  type TaskProviderAdapter,
  type TaskReview,
  type TaskRoutingAuthority,
  type TaskVerificationAdapter,
  type TaskVerificationPolicy,
} from "../../packages/core/dist/index.js";
import { campaign } from "../../packages/core/src/tasks/benchmark.test-helper.js";
import { createTaskRunAdapter } from "../../packages/cli/src/tasks/application-adapter.js";
import { createTaskGitFixture } from "../../packages/cli/src/tasks/git-fixture.test-helper.js";
import { fixtureRoot, inventory } from "./fixture-tools.js";
import { managedBenchmarkFixtureDraft } from "./managed-benchmark-blueprints.js";
export const HASH = taskContentHash("offline-managed-benchmark-failure");
export const strong = {
  adapterId: "openai-responses-v1" as const,
  providerId: "openai-responses-v1" as const,
  modelProfileId: "simulated-strong",
  nativeEffortId: "low",
};
const baseline = { ...strong, modelProfileId: "simulated-baseline", nativeEffortId: "none" };
function checked<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.data;
}
const elapsed = (start: number) => Math.ceil(performance.now() - start);
/** Test-only frozen hydration, real disposable Git baselines and simulated provider/definition ports. */
export function createManagedBenchmarkFailureHost(
  parent: string,
  fixtureId: TaskBenchmarkFixture["fixtureId"] = "types-result-v1",
) {
  const projectRoots: string[] = [],
    inputs: unknown[] = [];
  let compilationDispatches = 0,
    codingDispatches = 0;
  const initial = campaign();
  const c: TaskBenchmarkCampaign = {
    ...initial,
    strongConfiguration: strong,
    pricingRevision: HASH,
    modelCatalogRevision: HASH,
    routingPolicyRevision: TASK_ROUTING_POLICY_REVISION,
  };
  const f = c.fixtures.find((f) => f.fixtureId === fixtureId)!;
  const definitions: TaskVerificationPolicy["definitions"] = TASK_CHECK_IDS.map((checkId) => ({
    checkId,
    definitionRevision: taskContentHash({ simulated: true, checkId }),
    authority: checkId.endsWith("acceptance") ? "reviewer" : "executor",
    criterionIds: [
      ...f.requirements.map((r) => `${r.requirementId}-task`),
      ...f.requirements.map((r) => `${r.requirementId}-phase`),
    ],
    requiredTestIds: checkId === "ts.unit" ? ["simulated-unreached-check"] : [],
    evidenceArtifactIds: ["simulated-unreached-evidence"],
  }));
  const verificationPolicy: TaskVerificationPolicy = {
    schemaVersion: 1,
    definitions,
    catalogRevision: taskVerificationCatalogHash(definitions),
  };
  const authority = {
    read: [...new Set([...f.seedFiles.map((file) => file.path), ...f.write])].map((path) => ({
      type: "file" as const,
      path,
    })),
    write: f.write,
    deny: [],
  };
  const policy: TaskReview["policy"] = {
    supportProfileId: f.supportProfileId,
    supportProfileRevision: 1,
    authority,
    checkCatalogRevision: verificationPolicy.catalogRevision,
    checkIds: [...TASK_CHECK_IDS],
    requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
    caseSensitivePaths: true,
  };
  const makeTask = (taskId: string, ids: string[], write: string[]): Task => ({
    taskId,
    objective: `Implement frozen ${taskId} requirements`,
    requirementIds: ids,
    kind: "implementation",
    constraints: [],
    scope: { ...authority, write },
    criteria: ids.map((requirementId) => ({
      criterionId: `${requirementId}-task`,
      statement: f.requirements.find((r) => r.requirementId === requirementId)!.text,
      requirementIds: [requirementId],
      evidenceKind: "reviewer_evidence",
      checkIds: ["task.acceptance"],
    })),
    requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
    outputs: [
      {
        artifactId: `${taskId}-output`,
        kind: "file_snapshot",
        paths: write,
        criterionIds: ids.map((id) => `${id}-task`),
      },
    ],
    capabilityRequirements: {
      features:
        f.fixtureId === "security-path-policy-v1" ||
        (f.fixtureId === "api-offline-v1" && taskId === "handler")
          ? ["local_logic", "security_sensitive"]
          : f.fixtureId === "cross-module-order-v1"
            ? ["interface_change", "cross_module"]
            : ["local_logic"],
      minimumCapabilityClass:
        f.fixtureId === "security-path-policy-v1" ||
        f.fixtureId === "cross-module-order-v1" ||
        (f.fixtureId === "api-offline-v1" && taskId === "handler")
          ? "strong"
          : "baseline",
      evidenceRefs: ids.map((requirementId) => ({ type: "requirement", requirementId })),
    },
  });
  const taskDraft = (review: TaskReview, whole: boolean): TaskPlanDraft =>
    managedBenchmarkFixtureDraft({ fixture: f, review, whole, makeTask });
  const fresh = async (name: string) => {
    const started = performance.now(),
      outer = path.join(parent, name),
      project = path.join(outer, "project"),
      stateRoot = path.join(outer, "state");
    await mkdir(outer);
    await cp(path.join(fixtureRoot, f.fixtureId, "seed"), project, { recursive: true });
    if (taskContentHash(await inventory(project)) !== f.seedRevision)
      throw new Error("Seed changed");
    await mkdir(stateRoot, { mode: 0o700 });
    const git = await createTaskGitFixture(project, outer, { addPrerequisites: false });
    const adapter = checked(
      await createTaskRunAdapter({ projectRoot: project, stateRoot, authority }),
    );
    const snapshot = checked(await adapter.snapshot());
    const text = await readFile(path.join(project, "docs/phase.md"), "utf8"),
      phaseHash = taskByteHash(text);
    const review: TaskReview = {
      kind: "task_review",
      schemaVersion: 1,
      policy,
      project: {
        rootIdentity: snapshot.rootIdentity,
        baselineCommit: git.baselineCommit,
        baselineTreeHash: taskContentHash(snapshot.entries),
      },
      phase: {
        phaseId: f.phaseId,
        sourcePath: "docs/phase.md",
        sourceFileHash: phaseHash,
        selectionHash: phaseHash,
        lineRange: { start: 1, end: text.match(/[^\n]*\n|[^\n]+$/g)!.length },
        requirements: f.requirements.map((r) => ({
          ...r,
          sourceRefs: [{ path: "docs/phase.md", fileHash: phaseHash }],
          phaseCriterionIds: [`${r.requirementId}-phase`],
        })),
        phaseCriteria: f.requirements.map((r) => ({
          criterionId: `${r.requirementId}-phase`,
          statement: r.text,
          evidenceKind: "reviewer_evidence",
          checkId: "phase.acceptance",
        })),
      },
    };
    projectRoots.push(project);
    // Only definition checks are reached: provider failures stop before E launches/reviews.
    const verifier: TaskVerificationAdapter = {
      snapshot: adapter.snapshot,
      verifyDefinitions: async () => ({ success: true, data: true }),
      prepare: async () => {
        throw new Error("Unexpected E check launch");
      },
      review: async () => {
        throw new Error("Unexpected E acceptance");
      },
    };
    return {
      project,
      stateRoot,
      git,
      adapter,
      snapshot,
      review,
      verifier,
      setupMs: elapsed(started),
    };
  };
  const roots: Partial<
    Record<"whole" | "fixed" | "routed" | "source", Awaited<ReturnType<typeof fresh>>>
  > = {};
  const provider = (
    configuration: TaskProviderAdapter["configuration"],
    mode: "compile" | "pending" | "refused",
  ): TaskProviderAdapter => ({
    configuration,
    prepare: ({ purpose, document, maxOutputTokens, timeoutMs }) => ({
      success: true,
      data: {
        purpose,
        configuration,
        requestHash: taskContentHash({ purpose, configuration, document }),
        payload: JSON.stringify(document),
        reservation: {
          calls: 1,
          inputTokens: 32768,
          outputTokens: maxOutputTokens,
          costMicrousd: 100000,
        },
        priceCatalogRevision: HASH,
        timeoutMs,
      },
    }),
    dispatch: async (prepared) => {
      inputs.push(JSON.parse(prepared.payload));
      if (mode === "compile") compilationDispatches++;
      else codingDispatches++;
      if (mode === "pending") throw new Error("Simulated transport uncertainty");
      return {
        outcome: mode === "compile" ? "completed" : "refused",
        httpStatus: 200,
        document: mode === "compile" ? taskDraft(roots.source!.review, false) : null,
        effectiveConfiguration: { provenance: "host_reported", configuration },
        usage: {
          inputTokens: { provenance: "host_reported", value: 10 },
          outputTokens: { provenance: "host_reported", value: 20 },
          totalTokens: { provenance: "host_reported", value: 30 },
          cachedInputTokens: { provenance: "unknown" },
          reasoningTokens: { provenance: "unknown" },
          costMicrousd: { provenance: "host_reported", value: 30 },
          providerCallId: null,
          durationMs: 0,
          priceCatalogRevision: HASH,
          reserved: prepared.reservation,
        },
      };
    },
  });
  const routing: TaskRoutingAuthority = {
    qualificationScope: "offline",
    catalog: sealTaskModelCatalog({
      kind: "task_model_catalog",
      schemaVersion: 1,
      profiles: [baseline, strong].map((configuration) => ({
        profileId: configuration.modelProfileId,
        adapterId: configuration.adapterId,
        providerId: configuration.providerId,
        available: true,
        reviewedAt: new Date(Date.now() - 86400000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        qualification: {
          status: "qualified",
          scope: "offline",
          evidenceHash: HASH,
          capabilityClass: configuration === baseline ? "baseline" : "strong",
          features:
            configuration === baseline
              ? ["local_logic"]
              : ["local_logic", "interface_change", "cross_module", "security_sensitive"],
        },
        efforts: [{ nativeEffortId: configuration.nativeEffortId, minimumOutputTokens: 256 }],
        maxContextTokens: 1050000,
        maxOutputTokens: 16384,
        price: {
          catalogRevision: HASH,
          inputMicrousdPerToken: configuration === baseline ? 1 : 2,
          outputMicrousdPerToken: 1,
        },
      })),
    }),
    preferences: {
      kind: "task_preferences",
      schemaVersion: 1,
      executionMode: "managed",
      qualityPreference: "balanced",
      supportProfileId: f.supportProfileId,
      providerAvailability: [
        {
          providerId: strong.providerId,
          enabled: true,
          modelProfileIds: [baseline.modelProfileId, strong.modelProfileId],
        },
      ],
      effortPreference: { type: "minimum_supported" },
      resourceLimits: f.resourceLimits,
      exclusions: [],
    },
  };
  c.modelCatalogRevision = routing.catalog.catalogRevision;
  return {
    c,
    f,
    roots,
    policy,
    verificationPolicy,
    taskDraft,
    fresh,
    provider,
    routing,
    projectRoots,
    inputs,
    counts: () => ({ compilationDispatches, codingDispatches }),
  };
}
