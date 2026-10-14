import type { TaskCompilationCheckpoint } from "../tasks/compilation-state.js";

/** Internal, process-local authentication. A parsed checkpoint never enters this registry.
 * Only a newly dispatched, durably completed and released compilation can seed a pair.
 * Cached reads deliberately cannot restart a campaign after process loss. */
const issued = new WeakMap<
  TaskCompilationCheckpoint,
  Map<string, { root: string; attempted: boolean }>
>();
export function registerTaskCompilationReceipt(checkpoint: TaskCompilationCheckpoint): void {
  if (checkpoint.status === "completed" && !checkpoint.benchmarkReplay)
    issued.set(checkpoint, new Map());
}
export function taskCompilationReplayClaims(checkpoint: TaskCompilationCheckpoint) {
  return issued.get(checkpoint);
}
