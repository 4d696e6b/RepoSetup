import type { TaskPlan } from "./plan-schema.js";
import type { PhaseRun } from "./run-schema.js";

/** Mutates only executor-owned in-memory state; preserves historical attempt/effect records. */
export function invalidateTaskConsumers(plan: TaskPlan, run: PhaseRun, taskId: string): string[] {
  const affected = new Set([taskId]);
  for (let changed = true; changed;) {
    changed = false;
    for (const edge of plan.dependencies)
      if (affected.has(edge.predecessorTaskId) && !affected.has(edge.consumerTaskId)) {
        affected.add(edge.consumerTaskId);
        changed = true;
      }
  }
  for (const state of run.tasks)
    if (affected.has(state.taskId)) {
      state.acceptedVerificationId = null;
      if (state.taskId !== taskId) {
        state.status =
          state.status === "accepted" || state.status === "invalidated" ? "invalidated" : "blocked";
        state.reasonCode = "TASK_VERIFICATION_STALE";
      }
    }
  run.acceptedArtifacts = run.acceptedArtifacts.filter((a) => !affected.has(a.producerTaskId));
  run.finalVerification = null;
  return [...affected];
}
