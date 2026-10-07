import * as z from "zod";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import {
  taskHashSchema,
  taskIdSchema,
  taskPathSchema,
  taskResourceLimitsSchema,
  taskCounterSchema,
} from "./primitives.js";
export const TASK_BENCHMARK_FIXTURE_IDS = [
  "types-result-v1",
  "ui-view-model-v1",
  "api-offline-v1",
  "cross-module-order-v1",
  "security-path-policy-v1",
] as const;
export const TASK_BENCHMARK_LIMITS = Object.freeze({
  maxImplementationAttemptsPerTask: 3,
  maxProviderCalls: 24,
  maxInputTokens: 240000,
  maxOutputTokens: 48000,
  maxWallTimeMs: 1800000,
  maxCostMicrousd: 10000000,
});
const files = z
  .array(
    z.strictObject({ path: taskPathSchema, fileHash: taskHashSchema, bytes: taskCounterSchema }),
  )
  .min(1)
  .max(128);
export const taskBenchmarkOracleResultSchema = z.strictObject({
  kind: z.literal("frozen_oracle_result"),
  schemaVersion: z.literal(1),
  results: z
    .array(z.strictObject({ testId: taskIdSchema, passed: z.boolean() }))
    .min(1)
    .max(128),
});
export const taskBenchmarkFixtureSchema = z.strictObject({
  kind: z.literal("task_benchmark_fixture"),
  schemaVersion: z.literal(1),
  fixtureRevision: taskHashSchema,
  fixtureId: z.enum(TASK_BENCHMARK_FIXTURE_IDS),
  fixtureVersion: z.literal(1),
  phaseId: taskIdSchema,
  requirements: z
    .array(z.strictObject({ requirementId: taskIdSchema, text: z.string().min(1).max(8192) }))
    .length(4),
  seedRevision: taskHashSchema,
  seedFiles: files,
  phaseDocumentHash: taskHashSchema,
  lockfileHash: taskHashSchema,
  dependencyArtifactId: taskHashSchema,
  recipeRevision: taskHashSchema,
  supportProfileId: z.literal("managed-ts-node-v1"),
  write: z.array(taskPathSchema).min(1).max(8),
  entrypoints: z
    .array(z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/))
    .min(1)
    .max(16),
  referenceFiles: files,
  incorrectVariants: z
    .array(z.strictObject({ variantId: taskIdSchema, files }))
    .min(1)
    .max(16),
  oracleFiles: files,
  oracleRevision: taskHashSchema,
  testInventory: z
    .array(
      z.strictObject({
        testId: taskIdSchema,
        criterionIds: z.array(taskIdSchema).min(1).max(4),
        kind: z.enum(["runtime", "type"]),
      }),
    )
    .min(1)
    .max(128),
  resourceLimits: taskResourceLimitsSchema,
});
export type TaskBenchmarkFixture = z.infer<typeof taskBenchmarkFixtureSchema>;
export function sealTaskBenchmarkFixture(
  value: Omit<TaskBenchmarkFixture, "fixtureRevision">,
): TaskBenchmarkFixture {
  return freezeTaskValue({ ...value, fixtureRevision: taskContentHash(value) });
}
/** Integrity/coverage only. A manifest cannot establish oracle or model qualification. */
export function validateTaskBenchmarkFixture(
  value: unknown,
): TaskParseResult<TaskBenchmarkFixture> {
  const parsed = taskBenchmarkFixtureSchema.safeParse(value);
  if (!parsed.success)
    return taskFailure("TASK_BENCHMARK_INVALID", "Frozen fixture violates the benchmark boundary.");
  const { fixtureRevision, ...payload } = parsed.data;
  const f = parsed.data,
    requirements = new Set(f.requirements.map((r) => r.requirementId));
  const ordered = (rows: z.infer<typeof files>) =>
    rows.every((r, i) => i === 0 || rows[i - 1]!.path < r.path);
  if (
    fixtureRevision !== taskContentHash(payload) ||
    f.seedRevision !== taskContentHash(f.seedFiles) ||
    f.oracleRevision !== taskContentHash(f.oracleFiles) ||
    requirements.size !== 4 ||
    new Set(f.write).size !== f.write.length ||
    new Set(f.entrypoints).size !== f.entrypoints.length ||
    new Set(f.testInventory.map((t) => t.testId)).size !== f.testInventory.length ||
    new Set(f.incorrectVariants.map((v) => v.variantId)).size !== f.incorrectVariants.length ||
    [f.seedFiles, f.referenceFiles, f.oracleFiles, ...f.incorrectVariants.map((v) => v.files)].some(
      (rows) => !ordered(rows),
    ) ||
    f.testInventory.some((t) => t.criterionIds.some((id) => !requirements.has(id))) ||
    [...requirements].some((id) => !f.testInventory.some((t) => t.criterionIds.includes(id))) ||
    f.seedFiles.find((r) => r.path === "docs/phase.md")?.fileHash !== f.phaseDocumentHash ||
    [...f.referenceFiles, ...f.incorrectVariants.flatMap((v) => v.files)].some(
      (r) => !f.write.includes(r.path),
    ) ||
    f.write.some((p) => !p.startsWith("src/") && !p.startsWith("test/agent/")) ||
    taskContentHash(f.resourceLimits) !== taskContentHash(TASK_BENCHMARK_LIMITS)
  )
    return taskFailure(
      "TASK_BENCHMARK_INVALID",
      "Fixture identities, ordered inventories, protected scope, coverage or equal ceilings differ.",
    );
  return { success: true, data: freezeTaskValue(f) };
}
