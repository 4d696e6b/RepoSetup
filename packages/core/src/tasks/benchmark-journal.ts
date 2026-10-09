import * as z from "zod";
import { freezeTaskValue, taskContentHash } from "./canonical.js";
import { taskFailure } from "./parse.js";
import { taskCounterSchema, taskHashSchema, taskIdSchema } from "./primitives.js";
import { TASK_BENCHMARK_FIXTURE_IDS } from "./benchmark-fixture.js";
import {
  benchmarkTreatmentOrder,
  taskBenchmarkCompilationSchema,
  taskBenchmarkTrialSchema,
  summarizeTaskBenchmark,
  summarizeTaskBenchmarkRequests,
  validateTaskBenchmarkCampaign,
  type TaskBenchmarkCompilation,
  type TaskBenchmarkRequest,
} from "./benchmark-report.js";

export const taskBenchmarkSetupSchema = z.strictObject({
  ready: z.boolean(),
  setupMs: z.strictObject({
    whole: taskCounterSchema,
    fixed: taskCounterSchema,
    routed: taskCounterSchema,
  }),
  failureCode: taskIdSchema.nullable(),
});
const identity = {
  fixtureId: z.enum(TASK_BENCHMARK_FIXTURE_IDS),
  block: z.number().int().min(0).max(4),
};
const eventSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("prepare_started"), ...identity }),
  z.strictObject({
    type: z.literal("prepare_finished"),
    ...identity,
    result: taskBenchmarkSetupSchema,
  }),
  z.strictObject({ type: z.literal("compile_started"), ...identity }),
  z.strictObject({
    type: z.literal("compile_finished"),
    ...identity,
    compilation: taskBenchmarkCompilationSchema,
  }),
  z.strictObject({
    type: z.literal("trial_started"),
    ...identity,
    treatment: z.enum(["whole", "fixed", "routed"]),
    order: z.number().int().min(0).max(2),
  }),
  z.strictObject({ type: z.literal("trial_finished"), trial: taskBenchmarkTrialSchema }),
]);
export const taskBenchmarkEventSchema = z.strictObject({
  schemaVersion: z.literal(1),
  campaignId: taskHashSchema,
  sequence: z.number().int().min(0).max(249),
  previousEventHash: taskHashSchema.nullable(),
  event: eventSchema,
  eventHash: taskHashSchema,
});
export type TaskBenchmarkEvent = z.infer<typeof taskBenchmarkEventSchema>;
export type TaskBenchmarkEventPayload = TaskBenchmarkEvent["event"];

/** Read-only audit of host records, never execution/resume authority or proof of actual work. */
export function validateTaskBenchmarkJournal(input: { campaign: unknown; events: unknown }) {
  const initial = validateTaskBenchmarkCampaign(input.campaign);
  if (!initial.success) return initial;
  const invalid = () =>
    taskFailure(
      "TASK_BENCHMARK_INVALID",
      "Benchmark journal identity, sequence or retained accounting differs.",
    );
  if (initial.data.trials.length !== 0 || initial.data.provenance !== "offline") return invalid();
  const parsed = z.array(taskBenchmarkEventSchema).max(250).safeParse(input.events);
  if (!parsed.success) return invalid();
  const campaignId = taskContentHash(initial.data),
    events = parsed.data;
  let campaign = initial.data,
    previous: string | null = null;
  let setup: z.infer<typeof taskBenchmarkSetupSchema> | null = null;
  let compilation: TaskBenchmarkCompilation | null = null;
  let pending: TaskBenchmarkEventPayload | null = null;
  const compilations: TaskBenchmarkCompilation[] = [];
  for (const [index, record] of events.entries()) {
    const { eventHash, ...payload } = record;
    if (
      record.campaignId !== campaignId ||
      record.sequence !== index ||
      record.previousEventHash !== previous ||
      eventHash !== taskContentHash(payload)
    )
      return invalid();
    previous = eventHash;
    const fixture = campaign.fixtures.find(
      (f) => f.fixtureId === TASK_BENCHMARK_FIXTURE_IDS[Math.floor(campaign.trials.length / 15)],
    );
    if (!fixture) return invalid();
    const block = Math.floor((campaign.trials.length % 15) / 3),
      order = campaign.trials.length % 3,
      treatment = benchmarkTreatmentOrder(block)[order]!;
    const e = record.event;
    if (e.type !== "trial_finished" && (e.fixtureId !== fixture.fixtureId || e.block !== block))
      return invalid();
    if (e.type === "prepare_started") {
      if (order !== 0 || setup !== null || pending !== null) return invalid();
      pending = e;
    } else if (e.type === "prepare_finished") {
      if (pending?.type !== "prepare_started" || e.result.ready !== (e.result.failureCode === null))
        return invalid();
      setup = e.result;
      pending = null;
    } else if (e.type === "compile_started") {
      if (pending !== null || !setup?.ready || treatment === "whole" || compilation !== null)
        return invalid();
      pending = e;
    } else if (e.type === "compile_finished") {
      if (pending?.type !== "compile_started" || !setup) return invalid();
      const probe = validateTaskBenchmarkCampaign({
        ...campaign,
        trials: [
          ...campaign.trials,
          {
            fixtureId: fixture.fixtureId,
            fixtureRevision: fixture.fixtureRevision,
            block,
            treatment,
            order,
            authorityHash: taskContentHash({
              seedRevision: fixture.seedRevision,
              write: fixture.write,
            }),
            resourceLimitsHash: taskContentHash(fixture.resourceLimits),
            setupMs: setup.setupMs[treatment],
            executionMs: 0,
            compilation: e.compilation,
            requests: [],
            attemptEvidenceHashes: [],
            outcome: "failed",
            failureCode: "compile-probe",
            failureStage: e.compilation.outcome === "failed" ? "compile" : "execution",
            finalEvidenceHash: null,
            protectedInputsUnchanged: false,
            forbiddenEffects: 0,
            checks: [],
            publicCriteria: [],
            publicTests: [],
            holdout: [],
          },
        ],
      });
      if (!probe.success) return invalid();
      compilation = e.compilation;
      compilations.push(compilation);
      pending = null;
    } else if (e.type === "trial_started") {
      if (
        pending !== null ||
        !setup?.ready ||
        e.treatment !== treatment ||
        e.order !== order ||
        (treatment !== "whole" && compilation?.outcome !== "completed")
      )
        return invalid();
      pending = e;
    } else {
      const t = e.trial;
      if (
        !setup ||
        t.fixtureId !== fixture.fixtureId ||
        t.block !== block ||
        t.treatment !== treatment ||
        t.order !== order ||
        t.setupMs !== setup.setupMs[treatment] ||
        taskContentHash(t.compilation) !==
          taskContentHash(treatment === "whole" ? null : compilation)
      )
        return invalid();
      if (!setup.ready) {
        if (
          pending !== null ||
          t.outcome !== "blocked" ||
          t.failureStage !== "setup" ||
          t.failureCode !== setup.failureCode
        )
          return invalid();
      } else if (treatment !== "whole" && compilation?.outcome === "failed") {
        if (pending !== null || t.outcome !== "failed" || t.failureStage !== "compile")
          return invalid();
      } else if (
        pending?.type !== "trial_started" ||
        (t.failureStage !== null && t.failureStage !== "execution")
      )
        return invalid();
      const next = validateTaskBenchmarkCampaign({ ...campaign, trials: [...campaign.trials, t] });
      if (!next.success) return invalid();
      campaign = next.data;
      pending = null;
      if (campaign.trials.length % 3 === 0) {
        setup = null;
        compilation = null;
      }
    }
  }
  const referenced = new Set(
    campaign.trials.flatMap((t) => (t.compilation ? [t.compilation.compilationId] : [])),
  );
  const unassignedCompilations = compilations.filter((c) => !referenced.has(c.compilationId));
  return {
    success: true as const,
    data: freezeTaskValue({ campaignId, campaign, events, pending, unassignedCompilations }),
  };
}

/** Include known unassigned requests, while keeping unknown interrupted usage explicitly unresolved. */
export function summarizeTaskBenchmarkJournal(
  input: Parameters<typeof validateTaskBenchmarkJournal>[0],
) {
  const journal = validateTaskBenchmarkJournal(input);
  if (!journal.success) return journal;
  const terminal = summarizeTaskBenchmark(journal.data.campaign);
  if (!terminal.success) return terminal;
  const requests = new Map<string, TaskBenchmarkRequest>();
  for (const t of journal.data.campaign.trials)
    for (const r of [...(t.compilation?.requests ?? []), ...t.requests])
      requests.set(r.requestHash, r);
  for (const c of journal.data.unassignedCompilations)
    for (const r of c.requests) requests.set(r.requestHash, r);
  return {
    success: true as const,
    data: freezeTaskValue({
      terminalReport: terminal.data,
      inclusiveKnownCashLedger: summarizeTaskBenchmarkRequests([...requests.values()]),
      unassignedCompilations: journal.data.unassignedCompilations,
      pendingOperation: journal.data.pending,
      dispatchAccountingComplete:
        journal.data.pending === null &&
        journal.data.unassignedCompilations.length === 0 &&
        terminal.data.complete,
      qualification: false as const,
    }),
  };
}
