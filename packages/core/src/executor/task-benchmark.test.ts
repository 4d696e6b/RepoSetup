import { describe, expect, it, vi } from "vitest";
import { taskContentHash } from "../tasks/canonical.js";
import { taskFailure } from "../tasks/parse.js";
import { summarizeTaskBenchmark, type TaskBenchmarkTrial } from "../tasks/benchmark-report.js";
import { executeTaskBenchmark, type TaskBenchmarkExecutionPorts } from "./task-benchmark.js";
import { fixture } from "../tasks/benchmark.test-helper.js";
async function execute(f: ReturnType<typeof fixture>, signal?: AbortSignal) {
  const r = await executeTaskBenchmark({
    campaign: f.campaign,
    ports: f.ports,
    ...(signal ? { signal } : {}),
  });
  if (!r.success) throw new Error(r.error.code);
  return r.data;
}
describe("serial offline campaign execution", () => {
  it("dispatches 75 slots serially, rotates order and retains one immutable shared compilation per block", async () => {
    const f = fixture();
    let active = 0,
      max = 0;
    for (const key of ["prepareBlock", "compile", "runTrial"] as const) {
      const original = f.ports[key];
      Object.assign(f.ports, {
        [key]: vi.fn(async (arg: never) => {
          active++;
          max = Math.max(max, active);
          await Promise.resolve();
          try {
            return await original(arg);
          } finally {
            active--;
          }
        }),
      });
    }
    const r = await execute(f);
    expect(r.complete).toBe(true);
    expect(r.stopCode).toBeNull();
    expect(max).toBe(1);
    expect(f.ports.prepareBlock).toHaveBeenCalledTimes(25);
    expect(f.ports.compile).toHaveBeenCalledTimes(25);
    expect(f.ports.runTrial).toHaveBeenCalledTimes(75);
    expect(r.retainedEvents).toHaveLength(250);
    for (const [i, event] of r.retainedEvents.entries()) {
      const { eventHash, ...payload } = event;
      expect(eventHash).toBe(taskContentHash(payload));
      expect(event.sequence).toBe(i);
      expect(event.previousEventHash).toBe(i ? r.retainedEvents[i - 1]!.eventHash : null);
      expect(Object.isFrozen(event.event)).toBe(true);
    }
    for (let i = 0; i < 25; i++) {
      const pair = f.compiles.slice(i * 3, i * 3 + 3).filter((c) => c !== null);
      expect(pair[0]).toBe(pair[1]);
    }
    const report = summarizeTaskBenchmark(r.campaign);
    if (!report.success) throw new Error(report.error.code);
    expect(report.data.comparisonQualified).toBe(false);
    expect(report.data.treatments.map((t) => t.resources.providerCalls)).toEqual([25, 50, 50]);
    expect(report.data.cashLedger.providerCalls).toBe(100);
    expect(report.data.cashLedger.chargedCostMicrousd).toBeNull();
    expect(f.campaign.trials).toEqual([]);
  });
  it("blocks the complete paired setup before any compilation/trial calls", async () => {
    const f = fixture();
    f.ports.prepareBlock = vi.fn(async () => ({
      ready: false,
      setupMs: { whole: 2, fixed: 3, routed: 4 },
      failureCode: "setup-unavailable",
    }));
    const r = await execute(f);
    expect(r.complete).toBe(true);
    expect(r.campaign.trials).toHaveLength(75);
    expect(
      r.campaign.trials.every(
        (t) => t.outcome === "blocked" && t.failureStage === "setup" && t.requests.length === 0,
      ),
    ).toBe(true);
    expect(f.ports.compile).not.toHaveBeenCalled();
    expect(f.ports.runTrial).not.toHaveBeenCalled();
  });
  it("retains failed shared compilation for both consumers without rerunning or calling them", async () => {
    const f = fixture(),
      original = f.ports.compile;
    f.ports.compile = vi.fn(async (d) => ({
      ...((await original(d)) as object),
      outcome: "failed",
      planId: null,
      taskCount: 0,
    }));
    const r = await execute(f);
    expect(r.complete).toBe(true);
    expect(f.ports.runTrial).toHaveBeenCalledTimes(25);
    expect(
      r.campaign.trials
        .filter((t) => t.treatment !== "whole")
        .every((t) => t.outcome === "failed" && t.failureStage === "compile"),
    ).toBe(true);
    const report = summarizeTaskBenchmark(r.campaign);
    if (!report.success) throw new Error(report.error.code);
    expect(report.data.treatments.map((t) => t.failed)).toEqual([0, 25, 25]);
    expect(report.data.cashLedger.providerCalls).toBe(50);
  });
  it("keeps an execution failure and unknown usage in inclusive totals without a hidden retry", async () => {
    const f = fixture(),
      original = f.ports.runTrial;
    f.ports.runTrial = vi.fn(async (s) => {
      const t = (await original(s)) as TaskBenchmarkTrial;
      return {
        ...t,
        outcome: "failed",
        failureCode: "provider-timeout",
        failureStage: "execution",
        requests: t.requests.map((r) => ({
          ...r,
          outcome: "incomplete",
          inputTokens: { provenance: "unknown" },
        })),
      };
    });
    const r = await execute(f);
    expect(r.complete).toBe(true);
    expect(f.ports.runTrial).toHaveBeenCalledTimes(75);
    const report = summarizeTaskBenchmark(r.campaign);
    if (!report.success) throw new Error(report.error.code);
    expect(report.data.treatments.map((t) => t.failed)).toEqual([25, 25, 25]);
    expect(report.data.cashLedger.inputTokens).toBeNull();
  });
  it.each(["prepareBlock", "compile", "runTrial"] as const)(
    "retains %s intent and stops on an unreported thrown outcome",
    async (key) => {
      const f = fixture();
      f.ports[key] = vi.fn(async () => {
        throw new Error("PRIVATE_FAILURE_MARKER");
      });
      const r = await execute(f);
      expect(r.complete).toBe(false);
      expect(r.stopCode).toBe("TASK_EXECUTION_INTERRUPTED");
      expect(r.retainedEvents.at(-1)!.event.type).toBe(
        key === "prepareBlock"
          ? "prepare_started"
          : key === "compile"
            ? "compile_started"
            : "trial_started",
      );
      expect(JSON.stringify(r)).not.toContain("PRIVATE_FAILURE_MARKER");
      expect(f.ports[key]).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    "prepare_started",
    "prepare_finished",
    "compile_started",
    "compile_finished",
    "trial_started",
    "trial_finished",
  ] as const)(
    "stops at failed %s storage and exposes the known unacknowledged event",
    async (type) => {
      const f = fixture();
      f.ports.retain = vi.fn<TaskBenchmarkExecutionPorts["retain"]>(async (e) => {
        if (e.event.type !== type) return { success: true, data: true };
        if (type === "compile_finished") throw new Error("PRIVATE_STORAGE_MARKER");
        return taskFailure("TASK_STATE_WRITE_FAILED", "PRIVATE_STORAGE_MARKER");
      });
      const r = await execute(f);
      expect(r.stopCode).toBe("TASK_STATE_WRITE_FAILED");
      expect(r.complete).toBe(false);
      expect(r.unacknowledgedEvent?.event.type).toBe(type);
      expect(JSON.stringify(r)).not.toContain("PRIVATE_STORAGE_MARKER");
      expect(r.retainedEvents.some((e) => e.event.type === type)).toBe(false);
      if (type === "trial_finished") expect(r.campaign.trials).toHaveLength(1);
      if (type === "compile_finished") {
        expect(r.unacknowledgedEvent?.event).toMatchObject({
          compilation: { requests: [{ purpose: "compile" }] },
        });
        expect(f.ports.compile).toHaveBeenCalledTimes(1);
        expect(f.ports.runTrial).toHaveBeenCalledTimes(1);
      }
      if (type === "trial_started") expect(f.ports.runTrial).not.toHaveBeenCalled();
      if (type === "compile_started") expect(f.ports.compile).not.toHaveBeenCalled();
      if (type === "prepare_started") expect(f.ports.prepareBlock).not.toHaveBeenCalled();
    },
  );
  it.each(["wrong-slot", "changed-compilation", "invalid-checks", "wrong-stage"])(
    "rejects %s metadata and stops before the next dispatch",
    async (kind) => {
      const f = fixture(),
        original = f.ports.runTrial;
      f.ports.runTrial = vi.fn(async (s) => {
        const t = (await original(s)) as TaskBenchmarkTrial;
        if (kind === "wrong-slot") return { ...t, block: 4 };
        if (kind === "wrong-stage")
          return {
            ...t,
            outcome: "failed",
            failureCode: "compile-failed",
            failureStage: "compile",
          };
        if (kind === "changed-compilation" && t.compilation)
          return { ...t, compilation: { ...t.compilation, planId: taskContentHash("different") } };
        if (kind === "invalid-checks") return { ...t, checks: [] };
        return t;
      });
      const r = await execute(f);
      expect(r.stopCode).toBe("TASK_BENCHMARK_INVALID");
      expect(r.complete).toBe(false);
      expect(f.ports.runTrial).toHaveBeenCalledTimes(kind === "changed-compilation" ? 2 : 1);
    },
  );
  it("rejects live/imported campaigns before calling any host port", async () => {
    const f = fixture();
    expect(
      await executeTaskBenchmark({
        campaign: { ...f.campaign, provenance: "live" },
        ports: f.ports,
      }),
    ).toMatchObject({ success: false });
    expect(f.ports.retain).not.toHaveBeenCalled();
    const r = await execute(f);
    vi.mocked(f.ports.retain).mockClear();
    expect(await executeTaskBenchmark({ campaign: r.campaign, ports: f.ports })).toMatchObject({
      success: false,
    });
    expect(f.ports.retain).not.toHaveBeenCalled();
  });
  it("stops before any port on cancellation", async () => {
    const f = fixture(),
      controller = new AbortController();
    controller.abort();
    const r = await execute(f, controller.signal);
    expect(r.stopCode).toBe("TASK_EXECUTION_ABORTED");
    expect(f.ports.retain).not.toHaveBeenCalled();
  });
  it("retains the observed result when cancellation arrives during a trial, then stops before more work", async () => {
    const f = fixture(),
      controller = new AbortController(),
      original = f.ports.runTrial;
    f.ports.runTrial = vi.fn(async (slot) => {
      const trial = await original(slot);
      controller.abort();
      return trial;
    });
    const r = await execute(f, controller.signal);
    expect(r.stopCode).toBe("TASK_EXECUTION_ABORTED");
    expect(r.campaign.trials).toHaveLength(1);
    expect(r.retainedEvents.at(-1)!.event.type).toBe("trial_finished");
    expect(f.ports.runTrial).toHaveBeenCalledTimes(1);
    expect(vi.mocked(f.ports.runTrial).mock.calls[0]![1]).toBe(controller.signal);
    expect(f.ports.compile).not.toHaveBeenCalled();
  });
  it("blocks concurrent dispatch of the same campaign and releases the local lock after stopping", async () => {
    const f = fixture(),
      controller = new AbortController();
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => {
        enter = resolve;
      }),
      released = new Promise<void>((resolve) => {
        release = resolve;
      });
    f.ports.retain = vi.fn(async () => {
      enter();
      await released;
      return { success: true as const, data: true as const };
    });
    const pending = execute(f, controller.signal);
    try {
      await entered;
      expect(await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports })).toMatchObject({
        success: false,
        error: { code: "TASK_EXECUTION_LOCKED" },
      });
    } finally {
      controller.abort();
      release();
      await pending;
    }
    const result = await execute(f, controller.signal);
    expect(result.stopCode).toBe("TASK_EXECUTION_ABORTED");
    expect(f.ports.prepareBlock).not.toHaveBeenCalled();
  });
});
