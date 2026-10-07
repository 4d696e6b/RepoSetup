import type { TaskParseResult } from "../tasks/parse.js";
import type { TaskRunCheckpoint } from "../tasks/checkpoint.js";
import type { TaskRepositoryReader } from "../tasks/context-types.js";
import type { TaskVerifierSnapshot } from "../tasks/verifier-files.js";
import type { TaskPreparedTextChange } from "../tasks/application.js";

/** These capabilities are trusted host ports, never plan/config/model fields. Only the executor invokes mutations. */
export interface TaskRunLease {
  load(runId: string): Promise<TaskParseResult<TaskRunCheckpoint | null>>;
  save(
    checkpoint: TaskRunCheckpoint,
    expectedRevision: number | null,
  ): Promise<TaskParseResult<true>>;
  stage(stagingId: string, text: string): Promise<TaskParseResult<true>>;
  inspectStage(
    stagingId: string,
    afterHash: string,
  ): Promise<TaskParseResult<"absent" | "present">>;
  release(): Promise<TaskParseResult<true>>;
}
export interface TaskRunAdapter {
  repository: TaskRepositoryReader;
  snapshot(): Promise<TaskParseResult<TaskVerifierSnapshot>>;
  acquire(recoverLockToken?: string): Promise<TaskParseResult<TaskRunLease>>;
  /** Complete batch safety/writeability check; returns missing parent directories in creation order. */
  preflight(changes: readonly TaskPreparedTextChange[]): Promise<TaskParseResult<string[]>>;
  createDirectory(path: string): Promise<TaskParseResult<true>>;
  inspectDirectory(path: string): Promise<TaskParseResult<"absent" | "present">>;
  install(
    lease: TaskRunLease,
    stagingId: string,
    change: TaskPreparedTextChange,
  ): Promise<TaskParseResult<true>>;
}
