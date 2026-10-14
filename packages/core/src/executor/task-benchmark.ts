import {
  createTaskBenchmarkTimer,
  isInvalidBenchmarkClock,
  type TaskBenchmarkHostTiming,
} from "../tasks/benchmark-timing.js";
import {
  taskBenchmarkSetupSchema,
  type TaskBenchmarkEvent,
  type TaskBenchmarkEventPayload,
} from "../tasks/benchmark-journal.js";
export type { TaskBenchmarkEvent } from "../tasks/benchmark-journal.js";
import { freezeTaskValue, taskContentHash } from "../tasks/canonical.js";
import { taskFailure, type TaskParseResult } from "../tasks/parse.js";
import {
  TASK_BENCHMARK_FIXTURE_IDS,
  type TaskBenchmarkFixture,
} from "../tasks/benchmark-fixture.js";
import {
  benchmarkTreatmentOrder,
  taskBenchmarkCompilationSchema,
  validateTaskBenchmarkCampaign,
  type TaskBenchmarkCampaign,
  type TaskBenchmarkCompilation,
  type TaskBenchmarkTrial,
} from "../tasks/benchmark-report.js";

type Block = Readonly<{ fixture: TaskBenchmarkFixture; block: number }>;
type Slot = Block &
  Readonly<{
    treatment: TaskBenchmarkTrial["treatment"];
    order: number;
    compilation: TaskBenchmarkCompilation | null;
  }>;
/** Trusted host ports only. Implementations own isolation, allowances and actual evidence. */
export interface TaskBenchmarkExecutionPorts {
  /** Optional host monotonic clock. Missing clock keeps timing explicitly unknown. */
  now?: () => number;
  /** Retain before acknowledging. Never dispatch work from an artifact or event. */
  retain(event: TaskBenchmarkEvent): Promise<TaskParseResult<true>>;
  /** Preflight all three fresh treatment roots before any request in this paired block. */
  prepareBlock(block: Block, signal?: AbortSignal): Promise<unknown>;
  /** Retain/validate one decomposition; the driver must replay its actual plan for both consumers. */
  compile(
    block: Block & { strongConfiguration: TaskBenchmarkCampaign["strongConfiguration"] },
    signal?: AbortSignal,
  ): Promise<unknown>;
  runTrial(slot: Slot, signal?: AbortSignal): Promise<unknown>;
}
export type TaskBenchmarkExecution = {
  complete: boolean;
  hostTiming: TaskBenchmarkHostTiming;
  campaign: TaskBenchmarkCampaign;
  retainedEvents: readonly TaskBenchmarkEvent[];
  /** Known event whose retention was not acknowledged; never automatic replay authority. */
  unacknowledgedEvent: TaskBenchmarkEvent | null;
  stopCode:
    | "TASK_BENCHMARK_INVALID"
    | "TASK_STATE_WRITE_FAILED"
    | "TASK_EXECUTION_INTERRUPTED"
    | "TASK_EXECUTION_ABORTED"
    | null;
};
const active = new Set<string>();

/** Serial offline coordinator. No process/filesystem/provider adapter or imported resume authority. */
export async function executeTaskBenchmark(input: {
  campaign: unknown;
  ports: TaskBenchmarkExecutionPorts;
  signal?: AbortSignal;
}): Promise<TaskParseResult<TaskBenchmarkExecution>> {
  input = { ...input, ports: { ...input.ports } };
  const timer = createTaskBenchmarkTimer(input.ports.now);
  if (!timer.success) return timer;
  const checked = validateTaskBenchmarkCampaign(input.campaign);
  if (!checked.success) return checked;
  if (checked.data.provenance !== "offline" || checked.data.trials.length !== 0)
    return taskFailure(
      "TASK_BENCHMARK_INVALID",
      "Offline execution requires a fresh campaign; imported trials are not resume authority.",
    );
  const campaignId = taskContentHash(checked.data);
  if (active.has(campaignId))
    return taskFailure(
      "TASK_EXECUTION_LOCKED",
      "This campaign is already executing in this coordinator.",
    );
  active.add(campaignId);
  let campaign = checked.data;
  const retained: TaskBenchmarkEvent[] = [];
  let unacknowledgedEvent: TaskBenchmarkEvent | null = null;
  let stopCode: TaskBenchmarkExecution["stopCode"] = null;
  const stopped = () => {
    if (input.signal?.aborted && stopCode === null) stopCode = "TASK_EXECUTION_ABORTED";
    return stopCode !== null;
  };
  const retain = async (event: TaskBenchmarkEventPayload): Promise<boolean> => {
    const payload = {
      schemaVersion: 1 as const,
      campaignId,
      sequence: retained.length,
      previousEventHash: retained.at(-1)?.eventHash ?? null,
      event,
    };
    const record = freezeTaskValue({ ...payload, eventHash: taskContentHash(payload) });
    let saved: TaskParseResult<true>;
    try {
      saved = await timer.data.measure("retention", () => input.ports.retain(record));
    } catch (error) {
      if (isInvalidBenchmarkClock(error)) {
        unacknowledgedEvent = record;
        stopCode = "TASK_BENCHMARK_INVALID";
        return false;
      }
      saved = taskFailure("TASK_STATE_WRITE_FAILED", "Campaign event storage failed.");
    }
    if (!saved || saved.success !== true || saved.data !== true) {
      unacknowledgedEvent = record;
      stopCode = "TASK_STATE_WRITE_FAILED";
      return false;
    }
    retained.push(record);
    return true;
  };
  const append = async (trial: TaskBenchmarkTrial): Promise<boolean> => {
    const next = validateTaskBenchmarkCampaign({
      ...campaign,
      trials: [...campaign.trials, trial],
    });
    if (!next.success) {
      stopCode = "TASK_BENCHMARK_INVALID";
      return false;
    }
    // Keep observed terminal results even if their retention fails; stop before any next dispatch.
    campaign = next.data;
    return retain({ type: "trial_finished", trial: campaign.trials.at(-1)! });
  };
  try {
    blocks: for (const fixtureId of TASK_BENCHMARK_FIXTURE_IDS) {
      const fixture = campaign.fixtures.find((f) => f.fixtureId === fixtureId)!;
      for (let block = 0; block < 5; block++) {
        const descriptor = freezeTaskValue({ fixture, block });
        if (
          stopped() ||
          !(await retain({ type: "prepare_started", fixtureId, block })) ||
          stopped()
        )
          break blocks;
        const setup = taskBenchmarkSetupSchema.safeParse(
          await timer.data.measure("prepare", () =>
            input.ports.prepareBlock(descriptor, input.signal),
          ),
        );
        if (!setup.success || setup.data.ready !== (setup.data.failureCode === null)) {
          stopCode = "TASK_BENCHMARK_INVALID";
          break blocks;
        }
        if (!(await retain({ type: "prepare_finished", fixtureId, block, result: setup.data })))
          break blocks;
        let compilation: TaskBenchmarkCompilation | null = null;
        for (const treatment of benchmarkTreatmentOrder(block)) {
          if (stopped()) break blocks;
          const order = benchmarkTreatmentOrder(block).indexOf(treatment);
          const base = {
            fixtureId,
            fixtureRevision: fixture.fixtureRevision,
            block,
            treatment,
            order,
            authorityHash: taskContentHash({
              seedRevision: fixture.seedRevision,
              write: fixture.write,
            }),
            resourceLimitsHash: taskContentHash(fixture.resourceLimits),
            setupMs: setup.data.setupMs[treatment],
            executionMs: 0,
            compilation: null,
            requests: [],
            attemptEvidenceHashes: [],
            outcome: "blocked" as const,
            failureCode: setup.data.failureCode,
            failureStage: "setup" as const,
            finalEvidenceHash: null,
            protectedInputsUnchanged: false,
            forbiddenEffects: 0,
            checks: [],
            publicCriteria: [],
            publicTests: [],
            holdout: [],
          };
          if (!setup.data.ready) {
            if (!(await append(base))) break blocks;
            continue;
          }
          if (treatment !== "whole" && compilation === null) {
            if (!(await retain({ type: "compile_started", fixtureId, block })) || stopped())
              break blocks;
            const parsed = taskBenchmarkCompilationSchema.safeParse(
              await timer.data.measure("compile", () =>
                input.ports.compile(
                  freezeTaskValue({
                    ...descriptor,
                    strongConfiguration: campaign.strongConfiguration,
                  }),
                  input.signal,
                ),
              ),
            );
            if (!parsed.success) {
              stopCode = "TASK_BENCHMARK_INVALID";
              break blocks;
            }
            // Validate request accounting in context without inventing an observed trial.
            const probe = validateTaskBenchmarkCampaign({
              ...campaign,
              trials: [
                ...campaign.trials,
                {
                  ...base,
                  compilation: parsed.data,
                  outcome: "failed",
                  failureCode: "compile-probe",
                  failureStage: parsed.data.outcome === "failed" ? "compile" : "execution",
                },
              ],
            });
            if (!probe.success) {
              stopCode = "TASK_BENCHMARK_INVALID";
              break blocks;
            }
            compilation = freezeTaskValue(parsed.data);
            if (!(await retain({ type: "compile_finished", fixtureId, block, compilation })))
              break blocks;
          }
          if (treatment !== "whole" && compilation?.outcome === "failed") {
            if (
              !(await append({
                ...base,
                compilation,
                outcome: "failed",
                failureCode: "compile-failed",
                failureStage: "compile",
              }))
            )
              break blocks;
            continue;
          }
          if (
            stopped() ||
            !(await retain({ type: "trial_started", fixtureId, block, treatment, order })) ||
            stopped()
          )
            break blocks;
          const slot = freezeTaskValue({
            ...descriptor,
            treatment,
            order,
            compilation: treatment === "whole" ? null : compilation,
          });
          const observed = await timer.data.measure("trial", () =>
            input.ports.runTrial(slot, input.signal),
          );
          const next = validateTaskBenchmarkCampaign({
            ...campaign,
            trials: [...campaign.trials, observed],
          });
          if (!next.success) {
            stopCode = "TASK_BENCHMARK_INVALID";
            break blocks;
          }
          const trial = next.data.trials.at(-1)!;
          if (
            trial.fixtureId !== fixtureId ||
            trial.block !== block ||
            trial.treatment !== treatment ||
            trial.setupMs !== base.setupMs ||
            taskContentHash(trial.compilation) !== taskContentHash(slot.compilation) ||
            (trial.failureStage !== null && trial.failureStage !== "execution")
          ) {
            stopCode = "TASK_BENCHMARK_INVALID";
            break blocks;
          }
          if (!(await append(trial))) break blocks;
        }
      }
    }
  } catch (error) {
    // A started operation with unreported outcome/usage stays pending. Do not fabricate zeros or retry.
    stopCode = isInvalidBenchmarkClock(error)
      ? "TASK_BENCHMARK_INVALID"
      : "TASK_EXECUTION_INTERRUPTED";
  } finally {
    active.delete(campaignId);
  }
  let hostTiming: TaskBenchmarkHostTiming;
  try {
    hostTiming = timer.data.finish();
  } catch {
    hostTiming = { provenance: "unknown" };
    stopCode ??= "TASK_BENCHMARK_INVALID";
  }
  return {
    success: true,
    data: freezeTaskValue({
      hostTiming,
      complete: campaign.trials.length === 75 && stopCode === null,
      campaign,
      retainedEvents: retained,
      unacknowledgedEvent,
      stopCode,
    }),
  };
}
