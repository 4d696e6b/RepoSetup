import type { TaskParseResult } from "../tasks/parse.js";
import type { TaskRunCheckpoint } from "../tasks/checkpoint.js";
import type { TaskRepositoryReader } from "../tasks/context-types.js";
import type { TaskVerifierSnapshot } from "../tasks/verifier-files.js";
import type { TaskPreparedTextChange } from "../tasks/application.js";

/** These capabilities are trusted host ports, never plan/config/model fields. Only the executor invokes mutations. */
export interface TaskRunLease {
  loadCompilation?(
    compilationId: string,
  ): Promise<
    TaskParseResult<import("../tasks/compilation-state.js").TaskCompilationCheckpoint | null>
  >;
  saveCompilation?(
    checkpoint: import("../tasks/compilation-state.js").TaskCompilationCheckpoint,
    expectedRevision: number | null,
  ): Promise<TaskParseResult<true>>;
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
  readonly rootInstance: string;
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

export type TaskRunSave = (
  type: "transition" | "effect" | "verification" | "reconciliation" | "request",
  taskId?: string,
  code?: import("../tasks/errors.js").TaskErrorCode,
) => Promise<TaskParseResult<true>>;

/** Ephemeral authentication of the durable binding, never serialized/imported authority. */
export type TaskRunAcceptanceReceipt = {
  verification: import("../tasks/evidence-schema.js").TaskVerificationResult;
  bindingHash: string;
  artifactHash: string;
};
