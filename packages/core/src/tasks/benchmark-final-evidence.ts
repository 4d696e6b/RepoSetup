import * as z from "zod";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskContainsPrivateMaterial } from "./portable-input.js";
import { taskFailure } from "./parse.js";
import { taskCounterSchema, taskHashSchema, taskIdSchema } from "./primitives.js";
import { TASK_BENCHMARK_FIXTURE_IDS } from "./benchmark-fixture.js";
import { validateTaskBenchmarkCampaign } from "./benchmark-report.js";
import { validateTaskBenchmarkJournal } from "./benchmark-journal.js";

const resultSchema = z.strictObject({ testId: taskIdSchema, passed: z.boolean() });
const casesSchema = z.strictObject({
  passed: z.boolean(),
  results: z.array(resultSchema).min(1).max(128),
});
/** No source, prompts, process output, paths or credentials in retained oracle records. */
export const taskBenchmarkFinalRecordSchema = z.strictObject({
  fixtureRevision: taskHashSchema,
  checkedRevision: taskHashSchema,
  projectionRevision: taskHashSchema,
  typecheck: z.boolean(),
  compatibility: casesSchema.nullable(),
  publicAcceptance: casesSchema.nullable(),
  durationMs: taskCounterSchema,
  terminalReason: z.enum(["declared_complete", "limit_reached"]),
  holdout: casesSchema.nullable(),
  typeContract: z
    .array(z.strictObject({ testId: taskIdSchema, passed: z.boolean(), executed: z.boolean() }))
    .max(128),
});
export type TaskBenchmarkFinalRecord = z.infer<typeof taskBenchmarkFinalRecordSchema>;
export const taskBenchmarkFinalEvidenceSchema = z.strictObject({
  kind: z.literal("task_benchmark_final_evidence"),
  schemaVersion: z.literal(1),
  campaignId: taskHashSchema,
  fixtureId: z.enum(TASK_BENCHMARK_FIXTURE_IDS),
  block: z.number().int().min(0).max(4),
  treatment: z.enum(["whole", "fixed", "routed"]),
  record: taskBenchmarkFinalRecordSchema,
  finalEvidenceHash: taskHashSchema,
});
export type TaskBenchmarkFinalEvidence = z.infer<typeof taskBenchmarkFinalEvidenceSchema>;
const same = (a: unknown, b: unknown) => taskContentHash(a) === taskContentHash(b);
const exactIds = (rows: { testId: string }[], ids: string[]) =>
  rows.length === ids.length && same(rows.map((r) => r.testId).sort(), [...ids].sort());
const invalid = () =>
  taskFailure(
    "TASK_BENCHMARK_INVALID",
    "Independent benchmark evidence differs from its frozen slot.",
  );

/** Integrity/coverage audit only; parsed/imported records never grant acceptance or resume authority. */
export function validateTaskBenchmarkFinalEvidence(input: {
  campaign: unknown;
  artifact: unknown;
}) {
  const campaign = validateTaskBenchmarkCampaign(input.campaign);
  if (!campaign.success) return campaign;
  const parsed = taskBenchmarkFinalEvidenceSchema.safeParse(input.artifact);
  if (!parsed.success || taskContainsPrivateMaterial(parsed.data)) return invalid();
  const a = parsed.data,
    r = a.record,
    f = campaign.data.fixtures.find((f) => f.fixtureId === a.fixtureId);
  if (
    !f ||
    a.campaignId !== taskContentHash({ ...campaign.data, trials: [] }) ||
    r.fixtureRevision !== f.fixtureRevision ||
    a.finalEvidenceHash !== taskContentHash(r) ||
    !exactIds(
      r.typeContract,
      f.testInventory.filter((t) => t.kind === "type").map((t) => t.testId),
    ) ||
    r.typeContract.some((t) => t.executed !== r.typecheck || (!t.executed && t.passed))
  )
    return invalid();
  if (r.typecheck) {
    if (
      !r.compatibility ||
      !r.publicAcceptance ||
      !r.holdout ||
      !exactIds([...r.compatibility.results, ...r.publicAcceptance.results], f.publicTestIds) ||
      !exactIds(
        r.holdout.results,
        f.testInventory.filter((t) => t.kind === "runtime").map((t) => t.testId),
      ) ||
      [r.compatibility, r.publicAcceptance, r.holdout].some(
        (c) => c.passed && !c.results.every((t) => t.passed),
      )
    )
      return invalid();
  } else if (r.compatibility !== null || r.publicAcceptance !== null || r.holdout !== null)
    return invalid();
  return { success: true as const, data: freezeTaskValue(a) };
}

/** Join independently retained records to terminal journal references, including failures.
 * Unreferenced records remain visible after interrupted terminal-event retention. */
export function inspectTaskBenchmarkFinalEvidence(input: {
  campaign: unknown;
  events: unknown;
  artifacts: unknown;
}) {
  const journal = validateTaskBenchmarkJournal(input);
  if (!journal.success) return journal;
  const rows = z.array(taskBenchmarkFinalEvidenceSchema).max(75).safeParse(input.artifacts);
  if (!rows.success) return invalid();
  const artifacts: TaskBenchmarkFinalEvidence[] = [];
  const slots = new Set<string>();
  for (const row of rows.data) {
    const checked = validateTaskBenchmarkFinalEvidence({ campaign: input.campaign, artifact: row });
    if (!checked.success) return checked;
    const key = `${row.fixtureId}/${row.block}/${row.treatment}`;
    if (slots.has(key)) return invalid();
    slots.add(key);
    artifacts.push(checked.data);
  }
  const missing: string[] = [];
  const linked = new Set<string>();
  for (const t of journal.data.campaign.trials) {
    const key = `${t.fixtureId}/${t.block}/${t.treatment}`;
    const a = artifacts.find((a) => `${a.fixtureId}/${a.block}/${a.treatment}` === key);
    if (t.finalEvidenceHash === null) {
      if (a) return invalid();
      continue;
    }
    if (!a) {
      missing.push(key);
      continue;
    }
    const r = a.record;
    const publicTests = [
      ...(r.compatibility?.results ?? []),
      ...(r.publicAcceptance?.results ?? []),
    ];
    const holdout = [
      ...(r.holdout?.results ?? []),
      ...r.typeContract.map(({ testId, passed }) => ({ testId, passed })),
    ];
    const sort = (rows: { testId: string; passed: boolean }[]) =>
      [...rows].sort((a, b) => a.testId.localeCompare(b.testId));
    if (
      t.finalEvidenceHash !== a.finalEvidenceHash ||
      !same(sort(t.publicTests), sort(publicTests)) ||
      !same(sort(t.holdout), sort(holdout)) ||
      t.checks.find((c) => c.checkId === "ts.typecheck")?.passed !== r.typecheck ||
      (t.outcome === "accepted" &&
        (r.terminalReason !== "declared_complete" ||
          !r.typecheck ||
          !r.compatibility?.passed ||
          !r.publicAcceptance?.passed ||
          !r.holdout?.passed ||
          !r.typeContract.every((t) => t.passed && t.executed)))
    )
      return invalid();
    linked.add(key);
  }
  const unreferenced = artifacts.filter(
    (a) => !linked.has(`${a.fixtureId}/${a.block}/${a.treatment}`),
  );
  if (
    unreferenced.some(
      (a) =>
        journal.data.pending?.type !== "trial_started" ||
        journal.data.pending.fixtureId !== a.fixtureId ||
        journal.data.pending.block !== a.block ||
        journal.data.pending.treatment !== a.treatment,
    )
  )
    return invalid();
  return {
    success: true as const,
    data: freezeTaskValue({
      artifacts,
      linkedRecords: linked.size,
      missing,
      unreferenced,
      acceptanceAuthenticated: false as const,
      qualification: false as const,
    }),
  };
}
