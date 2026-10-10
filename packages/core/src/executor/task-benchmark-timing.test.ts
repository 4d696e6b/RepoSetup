import { describe, expect, it } from "vitest";
import { executeTaskBenchmark } from "./task-benchmark.js";
import { fixture } from "../tasks/benchmark.test-helper.js";
import type { TaskBenchmarkExecutionPorts } from "./task-benchmark.js";
function timed() {
  const f = fixture();
  let ticks = 0;
  const ports: TaskBenchmarkExecutionPorts = { ...f.ports, now: () => ticks++ };
  for (const [key, duration] of [
    ["retain", 2],
    ["prepareBlock", 3],
    ["compile", 5],
    ["runTrial", 7],
  ] as const) {
    const original = f.ports[key];
    Object.assign(ports, {
      [key]: async (arg: never) => {
        ticks += duration;
        return original(arg);
      },
    });
  }
  return { ...f, ports };
}
describe("inclusive host invocation timing", () => {
  it("measures acknowledged retention, setup, shared compilation, trial ports and coordinator time once", async () => {
    const f = timed();
    const result = await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports });
    if (!result.success) throw new Error(result.error.code);
    expect(result.data.hostTiming).toEqual({
      provenance: "measured",
      elapsedMs: 1976,
      retentionMs: 750,
      prepareMs: 100,
      compileMs: 150,
      trialMs: 600,
      coordinatorMs: 376,
    });
    expect(result.data.complete).toBe(true);
  });
  it("does not invent timing when no monotonic clock is supplied", async () => {
    const f = fixture();
    const result = await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports });
    expect(result).toMatchObject({
      success: true,
      data: { hostTiming: { provenance: "unknown" } },
    });
  });
  it("includes a thrown trial and its retained intent without fabricating resource usage", async () => {
    const f = timed();
    f.ports.runTrial = async () => {
      throw new Error("PRIVATE_MARKER");
    };
    const result = await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports });
    expect(result).toMatchObject({
      success: true,
      data: {
        complete: false,
        stopCode: "TASK_EXECUTION_INTERRUPTED",
        hostTiming: { provenance: "measured", trialMs: 1 },
      },
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_MARKER");
  });
  it.each([NaN, Infinity, -1])(
    "rejects invalid initial clock %s before retention or effects",
    async (sample) => {
      const f = fixture();
      expect(
        await executeTaskBenchmark({
          campaign: f.campaign,
          ports: { ...f.ports, now: () => sample },
        }),
      ).toMatchObject({ success: false, error: { code: "TASK_BENCHMARK_INVALID" } });
      expect(f.ports.retain).not.toHaveBeenCalled();
      expect(f.ports.prepareBlock).not.toHaveBeenCalled();
    },
  );
  it("stops on a backwards clock and marks the invocation timing unknown", async () => {
    const f = fixture();
    let call = 0;
    const result = await executeTaskBenchmark({
      campaign: f.campaign,
      ports: { ...f.ports, now: () => (++call < 3 ? 2 : 1) },
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        complete: false,
        stopCode: "TASK_BENCHMARK_INVALID",
        hostTiming: { provenance: "unknown" },
      },
    });
    expect(f.ports.prepareBlock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      data: { retainedEvents: [{ event: { type: "prepare_started" } }], unacknowledgedEvent: null },
    });
  });
  it("preserves a returned terminal outcome when its trailing clock fails", async () => {
    const f = fixture();
    let call = 0;
    const result = await executeTaskBenchmark({
      campaign: f.campaign,
      ports: { ...f.ports, now: () => (++call < 11 ? call : 0) },
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        complete: false,
        stopCode: "TASK_BENCHMARK_INVALID",
        hostTiming: { provenance: "unknown" },
        campaign: { trials: [{ outcome: "accepted" }] },
        unacknowledgedEvent: { event: { type: "trial_finished" } },
      },
    });
    expect(f.ports.runTrial).toHaveBeenCalledTimes(1);
  });
});
