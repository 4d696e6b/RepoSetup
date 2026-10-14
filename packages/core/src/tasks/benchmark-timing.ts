import { freezeTaskValue } from "./canonical.js";
import { taskFailure } from "./parse.js";
export type TaskBenchmarkTimingCategory = "retention" | "prepare" | "compile" | "trial";
export type TaskBenchmarkHostTiming =
  | { provenance: "unknown" }
  | {
      provenance: "measured";
      elapsedMs: number;
      retentionMs: number;
      prepareMs: number;
      compileMs: number;
      trialMs: number;
      coordinatorMs: number;
    };
class InvalidBenchmarkClock extends Error {}
export const isInvalidBenchmarkClock = (error: unknown) => error instanceof InvalidBenchmarkClock;
/** Trusted monotonic clock port; timings describe this invocation, not model usage or acceptance. */
export function createTaskBenchmarkTimer(clock?: () => number) {
  let previous = 0,
    invalid = false;
  const sample = () => {
    if (invalid) throw new InvalidBenchmarkClock();
    let value: number;
    try {
      value = clock!();
    } catch {
      invalid = true;
      throw new InvalidBenchmarkClock();
    }
    if (!Number.isFinite(value) || value < previous || value > Number.MAX_SAFE_INTEGER) {
      invalid = true;
      throw new InvalidBenchmarkClock();
    }
    previous = value;
    return value;
  };
  let start = 0;
  try {
    if (clock) start = sample();
  } catch {
    return taskFailure("TASK_BENCHMARK_INVALID", "Benchmark monotonic clock is unavailable.");
  }
  const durations = { retention: 0, prepare: 0, compile: 0, trial: 0 };
  return {
    success: true as const,
    data: {
      measure: async <T>(category: TaskBenchmarkTimingCategory, work: () => Promise<T>) => {
        if (!clock) return work();
        const before = sample();
        try {
          return await work();
        } finally {
          // Keep a known work result/throw even if the trailing clock observation fails.
          // A latched invalid clock stops the next dispatch and makes timing unknown.
          try {
            durations[category] += sample() - before;
          } catch {
            invalid = true;
          }
        }
      },
      finish: (): TaskBenchmarkHostTiming => {
        if (!clock) return { provenance: "unknown" };
        const elapsedMs = sample() - start;
        const portMs = Object.values(durations).reduce((sum, value) => sum + value, 0);
        const coordinatorMs = elapsedMs - portMs;
        if (!Number.isFinite(coordinatorMs) || coordinatorMs < 0) throw new InvalidBenchmarkClock();
        return freezeTaskValue({
          provenance: "measured" as const,
          elapsedMs,
          retentionMs: durations.retention,
          prepareMs: durations.prepare,
          compileMs: durations.compile,
          trialMs: durations.trial,
          coordinatorMs,
        });
      },
    },
  };
}
