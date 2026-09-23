import type { RepoSetupError } from "../errors/model.js";
import type { InstallationOperation } from "../operations/types.js";

export interface ExecutorFileSystem {
  exists(path: string): Promise<boolean>;
  isDirectory(path: string): Promise<boolean>;
  canWrite(path: string): Promise<boolean>;
  availableDiskBytes?(path: string): Promise<number>;
  realpath(path: string): Promise<string>;
  mkdir(path: string): Promise<void>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  writeFileAtomic(path: string, content: string): Promise<void>;
  writeFileExclusive(path: string, content: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
}

export interface ProcessRunRequest {
  command: string;
  args: readonly string[];
  cwd: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  onOutput?: (event: ProcessOutputEvent) => void;
}

export interface ProcessOutputEvent {
  stream: "stdout" | "stderr";
  text: string;
}

export interface ProcessRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  notFound?: boolean;
  aborted?: boolean;
  timedOut?: boolean;
  outputTruncated?: boolean;
}

export type ProcessRunner = (request: ProcessRunRequest) => Promise<ProcessRunResult>;

export type ExecutableResolver = (command: string) => Promise<string | undefined>;

export interface ExecutionLockHandle {
  release(): Promise<void>;
}

export type ExecutionLockAcquireResult =
  | { ok: true; handle: ExecutionLockHandle }
  | { ok: false; reason: "already_locked" | "unavailable" };

export interface ExecutionLock {
  acquire(rootDir: string): Promise<ExecutionLockAcquireResult>;
}

export interface ExecutionJournalEntry {
  operationId: string;
  index: number;
  operationType: InstallationOperation["type"];
  status: "started" | "succeeded" | "failed";
  durationMs?: number;
  errorCode?: RepoSetupError["code"];
}

export interface ExecutionJournal {
  start(rootDir: string): Promise<void>;
  record(entry: ExecutionJournalEntry): Promise<void>;
  finish(outcome: "succeeded" | "failed"): Promise<void>;
}

export type ExecutionEvent =
  | {
      type: "operation_started";
      index: number;
      operationType: InstallationOperation["type"];
      description: string;
    }
  | {
      type: "operation_succeeded";
      index: number;
      operationType: InstallationOperation["type"];
      description: string;
      durationMs: number;
    }
  | {
      type: "operation_failed";
      index: number;
      operationType: InstallationOperation["type"];
      description: string;
      durationMs: number;
      errorCode: RepoSetupError["code"];
    };

export interface ExecutorLogger {
  info(message: string): void;
  verbose(message: string): void;
  output?(message: string): void;
}

export interface ExecuteOptions {
  rootDir: string;
  fs: ExecutorFileSystem;
  runProcess: ProcessRunner;
  resolveExecutable?: ExecutableResolver;
  executionLock?: ExecutionLock;
  executionJournal?: ExecutionJournal;
  onEvent?: (event: ExecutionEvent) => void;
  commandExists?: (command: string) => Promise<boolean>;
  logger?: ExecutorLogger;
  signal?: AbortSignal;
  commandTimeoutMs?: number;
  longRunningCommandTimeoutMs?: number;
  minimumFreeDiskBytes?: number;
}

export interface ExecutionContext {
  rootDir: string;
  fs: ExecutorFileSystem;
  runProcess: ProcessRunner;
  resolveExecutable?: ExecutableResolver;
  commandExists?: (command: string) => Promise<boolean>;
  logger: ExecutorLogger;
  logs: string[];
  signal?: AbortSignal;
  commandTimeoutMs?: number;
  longRunningCommandTimeoutMs?: number;
  minimumFreeDiskBytes?: number;
  onEvent?: (event: ExecutionEvent) => void;
  executionJournal?: ExecutionJournal;
}

export type ExecuteResult =
  | { ok: true; executed: number; logs: string[] }
  | { ok: false; executed: number; error: RepoSetupError; logs: string[] };
