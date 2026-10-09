import { describe, expect, it } from "vitest";
import { executeTaskBenchmark } from "../executor/task-benchmark.js";
import { fixture } from "./benchmark.test-helper.js";
import { taskContentHash } from "./canonical.js";
import {
  validateTaskBenchmarkJournal,
  summarizeTaskBenchmarkJournal,
  type TaskBenchmarkEvent,
} from "./benchmark-journal.js";
async function records() {
  const f = fixture();
  const r = await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports });
  if (!r.success) throw new Error(r.error.code);
  return { ...f, events: structuredClone([...r.data.retainedEvents]) };
}
function rechain(events: TaskBenchmarkEvent[]) {
  let previous: string | null = null;
  for (const [sequence, event] of events.entries()) {
    const { eventHash: _old, ...payload } = event;
    void _old;
    Object.assign(event, { sequence, previousEventHash: previous });
    payload.sequence = sequence;
    payload.previousEventHash = previous;
    event.eventHash = taskContentHash(payload);
    previous = event.eventHash;
  }
}
describe("read-only benchmark journal audit and interrupted accounting", () => {
  it("audits the complete serial chain and matches ordinary terminal/cash accounting", async () => {
    const f = await records();
    const r = summarizeTaskBenchmarkJournal({ campaign: f.campaign, events: f.events });
    if (!r.success) throw new Error(r.error.code);
    expect(r.data.terminalReport.complete).toBe(true);
    expect(r.data.inclusiveKnownCashLedger).toEqual(r.data.terminalReport.cashLedger);
    expect(r.data.qualification).toBe(false);
  });
  it("includes compilation requests that have not yet been assigned to a terminal trial", async () => {
    const f = await records();
    const prefix = f.events.slice(0, 6);
    const r = summarizeTaskBenchmarkJournal({ campaign: f.campaign, events: prefix });
    if (!r.success) throw new Error(r.error.code);
    expect(r.data.terminalReport.cashLedger.providerCalls).toBe(1);
    expect(r.data.inclusiveKnownCashLedger.providerCalls).toBe(2);
    expect(r.data.unassignedCompilations).toHaveLength(1);
    expect(r.data.dispatchAccountingComplete).toBe(false);
    const started = summarizeTaskBenchmarkJournal({
      campaign: f.campaign,
      events: f.events.slice(0, 7),
    });
    if (!started.success) throw new Error(started.error.code);
    expect(started.data.pendingOperation?.type).toBe("trial_started");
    expect(started.data.inclusiveKnownCashLedger.providerCalls).toBe(2);
  });
  it.each([
    "sequence",
    "hash",
    "campaign",
    "missing-intent",
    "wrong-block",
    "plan-swap",
    "extra-field",
  ])("rejects %s corruption even when a record is rehashed", async (kind) => {
    const f = await records();
    const events = f.events;
    if (kind === "sequence") events[0]!.sequence = 2;
    if (kind === "hash") events[0]!.eventHash = taskContentHash("forged");
    if (kind === "campaign") events[0]!.campaignId = taskContentHash("different");
    if (kind === "missing-intent") {
      events.splice(4, 1);
      rechain(events);
    }
    if (kind === "wrong-block") {
      const e = events[2]!.event;
      if (e.type !== "trial_started") throw new Error("event");
      e.block = 4;
      rechain(events);
    }
    if (kind === "plan-swap") {
      const e = events[7]!.event;
      if (e.type !== "trial_finished" || !e.trial.compilation) throw new Error("event");
      e.trial.compilation.planId = taskContentHash("different");
      rechain(events);
    }
    if (kind === "extra-field") {
      Object.assign(events[0]!.event, { command: "PRIVATE_MARKER" });
      rechain(events);
    }
    const r = validateTaskBenchmarkJournal({ campaign: f.campaign, events });
    expect(r).toMatchObject({ success: false, error: { code: "TASK_BENCHMARK_INVALID" } });
    expect(JSON.stringify(r)).not.toContain("PRIVATE_MARKER");
  });
});
