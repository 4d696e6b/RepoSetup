import { validateTaskPlan, type TaskCompilationPolicy } from "../tasks/compile.js";
import { validateTaskRunCheckpoint } from "../tasks/checkpoint.js";
import {
  collectTaskBenchmarkRunEvidence,
  type TaskBenchmarkRunEvidence,
} from "../tasks/benchmark-run-evidence.js";
import { taskFailure, type TaskParseResult } from "../tasks/parse.js";
import { taskRunIdSchema } from "../tasks/primitives.js";
import type { TaskRunAdapter } from "./task-run-types.js";

/** Read under a private lease, without reconciliation, new requests, verifier calls,
 * checkpoint rewrites or project effects. Lease metadata may be created by the adapter.
 * Drift is reported as diagnostic evidence; it never triggers automatic recovery. */
export async function inspectTaskBenchmarkRun(input: {
  plan: unknown;
  policy: TaskCompilationPolicy;
  runId: string;
  adapter: TaskRunAdapter;
  signal?: AbortSignal;
}): Promise<TaskParseResult<TaskBenchmarkRunEvidence>> {
  const plan = validateTaskPlan(input.plan, input.policy);
  if (!plan.success) return plan;
  if (!taskRunIdSchema.safeParse(input.runId).success)
    return taskFailure("TASK_RUN_STATE_INVALID", "Inspection run identity is invalid.");
  if (input.signal?.aborted)
    return taskFailure("TASK_EXECUTION_ABORTED", "Inspection cancelled before lease access.");
  const acquired = await input.adapter.acquire();
  if (!acquired.success) return acquired;
  const lease = acquired.data;
  let result: TaskParseResult<TaskBenchmarkRunEvidence>;
  try {
    const loaded = await lease.load(input.runId);
    if (!loaded.success) result = loaded;
    else {
      const checked = validateTaskRunCheckpoint(loaded.data);
      if (!checked.success) result = checked;
      else if (
        checked.data.run.runId !== input.runId ||
        checked.data.rootInstance !== input.adapter.rootInstance
      )
        result = taskFailure(
          "TASK_PROJECT_DRIFT",
          "Inspection private run belongs to a different physical root.",
        );
      else {
        const compilation =
          checked.data.compilation && lease.loadCompilation
            ? await lease.loadCompilation(checked.data.compilation.compilationId)
            : null;
        if (compilation && !compilation.success) result = compilation;
        else if (compilation?.success && compilation.data === null)
          result = taskFailure(
            "TASK_RUN_STATE_INVALID",
            "The run's private compilation charge is absent.",
          );
        else {
          const snapshot = await input.adapter.snapshot();
          result = snapshot.success
            ? collectTaskBenchmarkRunEvidence({
                plan: plan.data,
                policy: input.policy,
                checkpoint: checked.data,
                currentSnapshot: snapshot.data,
                ...(compilation?.success ? { compilationCheckpoint: compilation.data } : {}),
              })
            : snapshot;
        }
      }
    }
  } catch {
    result = taskFailure(
      "TASK_EXECUTION_INTERRUPTED",
      "Private benchmark evidence inspection could not complete.",
    );
  }
  try {
    const released = await lease.release();
    return released.success ? result : released;
  } catch {
    return taskFailure("TASK_EXECUTION_LOCKED", "Inspection lease could not be safely released.");
  }
}
