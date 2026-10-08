import * as z from "zod";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import { taskConfigurationSchema, taskEffectiveConfigurationSchema } from "./evidence-schema.js";
import { taskCounterSchema, taskHashSchema, taskIdSchema } from "./primitives.js";
import {
  TASK_BENCHMARK_FIXTURE_IDS,
  TASK_BENCHMARK_LIMITS,
  taskBenchmarkFixtureSchema,
  validateTaskBenchmarkFixture,
} from "./benchmark-fixture.js";

export const TASK_BENCHMARK_TREATMENTS = ["whole", "fixed", "routed"] as const;
const measured = z.discriminatedUnion("provenance", [
  z.strictObject({ provenance: z.literal("unknown") }),
  z.strictObject({ provenance: z.literal("reported"), value: taskCounterSchema }),
]);
const requestSchema = z.strictObject({
  requestHash: taskHashSchema,
  purpose: z.enum(["compile", "context", "implementation", "repair"]),
  requested: taskConfigurationSchema,
  effective: taskEffectiveConfigurationSchema,
  outcome: z.enum(["completed", "failed", "refused", "cancelled", "incomplete", "invalid"]),
  durationMs: taskCounterSchema,
  priceRevision: taskHashSchema,
  contextBytes: taskCounterSchema,
  estimatedInputTokens: taskCounterSchema.nullable(),
  inputTokens: measured,
  outputTokens: measured,
  cachedInputTokens: measured,
  reasoningTokens: measured,
  calculatedCostMicrousd: taskCounterSchema.nullable(),
  chargedCostMicrousd: measured,
});
const compilationSchema = z.strictObject({
  compilationId: taskHashSchema,
  outcome: z.enum(["completed", "failed"]),
  planId: taskHashSchema.nullable(),
  taskCount: taskCounterSchema.max(6),
  elapsedMs: taskCounterSchema,
  requests: z.array(requestSchema).min(1).max(24),
});
const trialSchema = z.strictObject({
  fixtureId: z.enum(TASK_BENCHMARK_FIXTURE_IDS),
  fixtureRevision: taskHashSchema,
  block: z.number().int().min(0).max(4),
  treatment: z.enum(TASK_BENCHMARK_TREATMENTS),
  order: z.number().int().min(0).max(2),
  authorityHash: taskHashSchema,
  resourceLimitsHash: taskHashSchema,
  setupMs: taskCounterSchema,
  executionMs: taskCounterSchema,
  compilation: compilationSchema.nullable(),
  requests: z.array(requestSchema).max(24),
  attemptEvidenceHashes: z.array(taskHashSchema).max(18),
  outcome: z.enum(["accepted", "failed", "blocked", "cancelled"]),
  failureCode: taskIdSchema.nullable(),
  failureStage: z.enum(["setup", "compile", "execution"]).nullable(),
  finalEvidenceHash: taskHashSchema.nullable(),
  protectedInputsUnchanged: z.boolean(),
  forbiddenEffects: taskCounterSchema,
  checks: z
    .array(
      z.strictObject({
        checkId: z.enum([
          "ts.typecheck",
          "ts.lint",
          "ts.unit",
          "task.acceptance",
          "phase.acceptance",
          "compatibility",
        ]),
        passed: z.boolean(),
        executedTests: taskCounterSchema.nullable(),
      }),
    )
    .max(6),
  publicCriteria: z
    .array(z.strictObject({ criterionId: taskIdSchema, passed: z.boolean() }))
    .max(128),
  publicTests: z.array(z.strictObject({ testId: taskIdSchema, passed: z.boolean() })).max(128),
  holdout: z.array(z.strictObject({ testId: taskIdSchema, passed: z.boolean() })).max(128),
});
export const taskBenchmarkCampaignSchema = z.strictObject({
  kind: z.literal("task_benchmark_campaign"),
  schemaVersion: z.literal(1),
  protocolRevision: taskHashSchema,
  provenance: z.enum(["offline", "live"]),
  sourceRevision: taskHashSchema,
  runnerRevision: taskHashSchema,
  host: z.strictObject({
    platform: z.enum(["darwin", "linux"]),
    architecture: z.enum(["arm64", "x64"]),
    nodeVersion: z.string().regex(/^v24\.[0-9]+\.[0-9]+$/),
  }),
  supportRevision: taskHashSchema,
  modelCatalogRevision: taskHashSchema,
  pricingRevision: taskHashSchema,
  routingPolicyRevision: taskHashSchema,
  productionQualificationEvidence: taskHashSchema.nullable(),
  strongConfiguration: taskConfigurationSchema,
  fixtures: z.array(taskBenchmarkFixtureSchema).length(5),
  trials: z.array(trialSchema).max(75),
});
export type TaskBenchmarkCampaign = z.infer<typeof taskBenchmarkCampaignSchema>;
export type TaskBenchmarkRequest = z.infer<typeof requestSchema>;
export type TaskBenchmarkTrial = z.infer<typeof trialSchema>;
export const TASK_BENCHMARK_PROTOCOL_REVISION = taskContentHash({
  version: 1,
  fixtures: TASK_BENCHMARK_FIXTURE_IDS,
  blocks: 5,
  treatments: TASK_BENCHMARK_TREATMENTS,
  limits: TASK_BENCHMARK_LIMITS,
  sharedCompile: "charge-full-to-each-analytical-once-cash",
  qualification: "25-per-treatment-zero-forbidden-effects",
  publicAcceptance: "exact-frozen-test-inventory",
});
export function benchmarkTreatmentOrder(
  block: number,
): readonly (typeof TASK_BENCHMARK_TREATMENTS)[number][] {
  return TASK_BENCHMARK_TREATMENTS.map((_, i) => TASK_BENCHMARK_TREATMENTS[(i + block) % 3]!);
}
const allChecks = [
  "ts.typecheck",
  "ts.lint",
  "ts.unit",
  "task.acceptance",
  "phase.acceptance",
  "compatibility",
] as const;
function exactIds(actual: readonly string[], expected: readonly string[]) {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    taskContentHash([...actual].sort()) === taskContentHash([...expected].sort())
  );
}
/** Strict metadata validation, not authentication of evaluator/provider evidence. */
export function validateTaskBenchmarkCampaign(
  value: unknown,
): TaskParseResult<TaskBenchmarkCampaign> {
  const parsed = taskBenchmarkCampaignSchema.safeParse(value);
  const invalid = () =>
    taskFailure(
      "TASK_BENCHMARK_INVALID",
      "Benchmark revisions, authority, trial accounting or independent evidence differ.",
    );
  if (!parsed.success) return invalid();
  const c = parsed.data;
  if (
    c.protocolRevision !== TASK_BENCHMARK_PROTOCOL_REVISION ||
    !exactIds(
      c.fixtures.map((f) => f.fixtureId),
      TASK_BENCHMARK_FIXTURE_IDS,
    ) ||
    c.fixtures.some((f) => !validateTaskBenchmarkFixture(f).success) ||
    c.fixtures.some((f) =>
      ["lockfileHash", "dependencyArtifactId", "recipeRevision"].some(
        (field) => f[field as "lockfileHash"] !== c.fixtures[0]![field as "lockfileHash"],
      ),
    )
  )
    return invalid();
  const trials = new Map<string, TaskBenchmarkTrial>(),
    requests = new Set<string>();
  const shared = new Map<string, string>();
  let previousSlot = -1;
  for (const t of c.trials) {
    const f = c.fixtures.find((f) => f.fixtureId === t.fixtureId)!;
    const key = `${t.fixtureId}/${t.block}/${t.treatment}`;
    if (
      trials.has(key) ||
      t.fixtureRevision !== f.fixtureRevision ||
      t.order !== benchmarkTreatmentOrder(t.block).indexOf(t.treatment) ||
      t.authorityHash !== taskContentHash({ seedRevision: f.seedRevision, write: f.write }) ||
      t.resourceLimitsHash !== taskContentHash(f.resourceLimits)
    )
      return invalid();
    const slot = TASK_BENCHMARK_FIXTURE_IDS.indexOf(t.fixtureId) * 15 + t.block * 3 + t.order;
    if (
      slot <= previousSlot ||
      new Set(t.attemptEvidenceHashes).size !== t.attemptEvidenceHashes.length
    )
      return invalid();
    previousSlot = slot;
    if (
      t.failureStage === "setup" &&
      (t.outcome !== "blocked" ||
        t.compilation !== null ||
        t.requests.length !== 0 ||
        t.attemptEvidenceHashes.length !== 0)
    )
      return invalid();
    trials.set(key, t);
    if (t.outcome === "accepted") {
      if (
        t.failureCode !== null ||
        t.failureStage !== null ||
        t.requests.length === 0 ||
        !t.protectedInputsUnchanged ||
        t.forbiddenEffects !== 0 ||
        t.finalEvidenceHash === null ||
        t.attemptEvidenceHashes.length === 0 ||
        !exactIds(
          t.checks.map((v) => v.checkId),
          allChecks,
        ) ||
        t.checks.some(
          (v) =>
            !v.passed ||
            (["ts.unit", "task.acceptance", "phase.acceptance", "compatibility"].includes(
              v.checkId,
            ) &&
              (v.executedTests === null || v.executedTests === 0)),
        ) ||
        !exactIds(
          t.publicCriteria.map((v) => v.criterionId),
          f.requirements.map((r) => r.requirementId),
        ) ||
        t.publicCriteria.some((v) => !v.passed) ||
        !exactIds(
          t.publicTests.map((v) => v.testId),
          f.publicTestIds,
        ) ||
        t.publicTests.some((v) => !v.passed) ||
        !exactIds(
          t.holdout.map((v) => v.testId),
          f.testInventory.map((v) => v.testId),
        ) ||
        t.holdout.some((v) => !v.passed)
      )
        return invalid();
    } else if (t.failureCode === null || t.failureStage === null) return invalid();
    if (t.treatment === "whole" && (t.compilation !== null || t.attemptEvidenceHashes.length > 3))
      return invalid();
    if (t.compilation) {
      const comp = t.compilation,
        sharedKey = `${t.fixtureId}/${t.block}`;
      if (
        t.treatment === "whole" ||
        comp.requests.some(
          (r) =>
            r.purpose !== "compile" ||
            taskContentHash(r.requested) !== taskContentHash(c.strongConfiguration),
        ) ||
        comp.elapsedMs < comp.requests.reduce((n, r) => n + r.durationMs, 0)
      )
        return invalid();
      if (
        comp.outcome === "completed"
          ? comp.planId === null ||
            comp.taskCount === 0 ||
            comp.requests.some((r) => r.outcome !== "completed")
          : comp.planId !== null ||
            comp.taskCount !== 0 ||
            t.outcome !== "failed" ||
            t.failureStage !== "compile" ||
            t.requests.length !== 0 ||
            t.attemptEvidenceHashes.length !== 0
      )
        return invalid();
      if (t.attemptEvidenceHashes.length > comp.taskCount * 3) return invalid();
      const hash = taskContentHash(comp);
      if (shared.has(sharedKey) && shared.get(sharedKey) !== hash) return invalid();
      if (!shared.has(sharedKey)) {
        shared.set(sharedKey, hash);
        for (const r of comp.requests) {
          if (requests.has(r.requestHash)) return invalid();
          requests.add(r.requestHash);
        }
      }
    } else if (t.treatment !== "whole" && !(t.failureStage === "setup")) return invalid();
    for (const r of t.requests) {
      if (
        requests.has(r.requestHash) ||
        r.purpose === "compile" ||
        (t.treatment !== "routed" &&
          taskContentHash(r.requested) !== taskContentHash(c.strongConfiguration))
      )
        return invalid();
      requests.add(r.requestHash);
    }
    const all = [...(t.compilation?.requests ?? []), ...t.requests];
    if (
      all.some(
        (r) =>
          r.priceRevision !== c.pricingRevision ||
          (r.inputTokens.provenance === "reported" &&
            r.cachedInputTokens.provenance === "reported" &&
            r.cachedInputTokens.value > r.inputTokens.value) ||
          (r.outputTokens.provenance === "reported" &&
            r.reasoningTokens.provenance === "reported" &&
            r.reasoningTokens.value > r.outputTokens.value),
      ) ||
      t.executionMs < t.requests.reduce((n, r) => n + r.durationMs, 0)
    )
      return invalid();
    // A run exceeding a ceiling is retained as a failure, never retrospectively accepted.
    if (
      t.outcome === "accepted" &&
      (all.length > TASK_BENCHMARK_LIMITS.maxProviderCalls ||
        t.executionMs + (t.compilation?.elapsedMs ?? 0) > TASK_BENCHMARK_LIMITS.maxWallTimeMs ||
        (knownTotal(all, "inputTokens") ?? 0) > TASK_BENCHMARK_LIMITS.maxInputTokens ||
        (knownTotal(all, "outputTokens") ?? 0) > TASK_BENCHMARK_LIMITS.maxOutputTokens ||
        (calculatedTotal(all) ?? 0) > TASK_BENCHMARK_LIMITS.maxCostMicrousd)
    )
      return invalid();
  }
  // Setup fails before provider requests: the complete observed paired block must agree.
  for (const t of c.trials) {
    const peers = c.trials.filter((p) => p.fixtureId === t.fixtureId && p.block === t.block);
    if (t.failureStage === "setup" && peers.some((p) => p.failureStage !== "setup"))
      return invalid();
    if (
      t.treatment !== "whole" &&
      peers.some(
        (p) => p.treatment !== "whole" && Boolean(p.compilation) !== Boolean(t.compilation),
      )
    )
      return invalid();
  }
  return { success: true, data: freezeTaskValue(c) };
}
type TokenField =
  "inputTokens" | "outputTokens" | "reasoningTokens" | "cachedInputTokens" | "chargedCostMicrousd";
function knownTotal(requests: readonly TaskBenchmarkRequest[], field: TokenField): number | null {
  let total = 0;
  for (const r of requests) {
    const v = r[field];
    if (v.provenance !== "reported") return null;
    total += v.value;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}
function calculatedTotal(requests: readonly TaskBenchmarkRequest[]): number | null {
  let total = 0;
  for (const r of requests) {
    if (r.calculatedCostMicrousd === null) return null;
    total += r.calculatedCostMicrousd;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}
function resources(requests: readonly TaskBenchmarkRequest[]) {
  return {
    providerCalls: requests.length,
    contextBytes: requests.reduce((n, r) => n + r.contextBytes, 0),
    estimatedInputTokens: requests.some((r) => r.estimatedInputTokens === null)
      ? null
      : requests.reduce((n, r) => n + r.estimatedInputTokens!, 0),
    inputTokens: knownTotal(requests, "inputTokens"),
    outputTokens: knownTotal(requests, "outputTokens"),
    reasoningTokens: knownTotal(requests, "reasoningTokens"),
    cachedInputTokens: knownTotal(requests, "cachedInputTokens"),
    calculatedCostMicrousd: calculatedTotal(requests),
    chargedCostMicrousd: knownTotal(requests, "chargedCostMicrousd"),
  };
}
function timing(values: number[]) {
  if (!values.length) return { minMs: null, medianMs: null, maxMs: null, totalMs: 0 };
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return {
    minMs: values[0]!,
    medianMs: values.length % 2 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2,
    maxMs: values.at(-1)!,
    totalMs: values.reduce((n, v) => n + v, 0),
  };
}
/** Includes every supplied terminal trial. Offline evidence never qualifies a live treatment. */
export function summarizeTaskBenchmark(value: unknown) {
  const checked = validateTaskBenchmarkCampaign(value);
  if (!checked.success) return checked;
  const c = checked.data,
    missing: string[] = [];
  for (const f of TASK_BENCHMARK_FIXTURE_IDS)
    for (let b = 0; b < 5; b++)
      for (const treatment of TASK_BENCHMARK_TREATMENTS)
        if (!c.trials.some((t) => t.fixtureId === f && t.block === b && t.treatment === treatment))
          missing.push(`${f}/${b}/${treatment}`);
  const complete = missing.length === 0;
  const treatments = TASK_BENCHMARK_TREATMENTS.map((treatment) => {
    const trials = c.trials.filter((t) => t.treatment === treatment),
      accepted = trials.filter((t) => t.outcome === "accepted").length;
    const requests = trials.flatMap((t) => [...(t.compilation?.requests ?? []), ...t.requests]);
    const totals = resources(requests);
    return {
      treatment,
      expectedTrials: 25,
      observedTrials: trials.length,
      accepted,
      blocked: trials.filter((t) => t.outcome === "blocked").length,
      failed: trials.filter((t) => t.outcome === "failed").length,
      cancelled: trials.filter((t) => t.outcome === "cancelled").length,
      qualified:
        complete &&
        c.provenance === "live" &&
        c.productionQualificationEvidence !== null &&
        accepted === 25 &&
        trials.every((t) => t.forbiddenEffects === 0),
      attributionComplete: requests.every((r) => r.effective.provenance !== "unknown"),
      forbiddenEffects: trials.reduce((n, t) => n + t.forbiddenEffects, 0),
      attempts: trials.reduce((n, t) => n + t.attemptEvidenceHashes.length, 0),
      perFixture: TASK_BENCHMARK_FIXTURE_IDS.map((fixtureId) => ({
        fixtureId,
        observed: trials.filter((t) => t.fixtureId === fixtureId).length,
        accepted: trials.filter((t) => t.fixtureId === fixtureId && t.outcome === "accepted")
          .length,
      })),
      failures: trials
        .filter((t) => t.outcome !== "accepted")
        .map((t) => ({
          fixtureId: t.fixtureId,
          block: t.block,
          outcome: t.outcome,
          code: t.failureCode,
        })),
      wallTime: timing(trials.map((t) => t.executionMs + (t.compilation?.elapsedMs ?? 0))),
      setupTime: timing(trials.map((t) => t.setupMs)),
      resources: totals,
      calculatedCostPerAcceptedMicrousd:
        accepted && totals.calculatedCostMicrousd !== null
          ? totals.calculatedCostMicrousd / accepted
          : null,
    };
  });
  const actual = new Map<string, TaskBenchmarkRequest>();
  for (const t of c.trials)
    for (const r of [...(t.compilation?.requests ?? []), ...t.requests])
      actual.set(r.requestHash, r);
  const payload = {
    kind: "task_benchmark_report" as const,
    schemaVersion: 1 as const,
    campaignHash: taskContentHash(c),
    provenance: c.provenance,
    complete,
    missing,
    treatments,
    cashLedger: resources([...actual.values()]),
    comparisonQualified: treatments.every(
      (t) =>
        t.qualified &&
        t.attributionComplete &&
        t.resources.inputTokens !== null &&
        t.resources.outputTokens !== null &&
        t.resources.calculatedCostMicrousd !== null,
    ),
  };
  return {
    success: true as const,
    data: freezeTaskValue({ ...payload, reportId: taskContentHash(payload) }),
  };
}
