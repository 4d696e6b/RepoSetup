import type { RepoSetupError } from "../errors/model.js";

export interface ExecutorFileSystem {
  exists(path: string): Promise<boolean>;
  isDirectory(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
}

export interface ProcessRunRequest {
  command: string;
  args: readonly string[];
  cwd: string;
}

export interface ProcessRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  notFound?: boolean;
}

export type ProcessRunner = (request: ProcessRunRequest) => Promise<ProcessRunResult>;

export interface ExecutorLogger {
  info(message: string): void;
  verbose(message: string): void;
}

export interface ExecuteOptions {
  rootDir: string;
  fs?: ExecutorFileSystem;
  runProcess?: ProcessRunner;
  commandExists?: (command: string) => Promise<boolean>;
  logger?: ExecutorLogger;
}

export interface ExecutionContext {
  rootDir: string;
  fs: ExecutorFileSystem;
  runProcess: ProcessRunner;
  commandExists?: (command: string) => Promise<boolean>;
  logger: ExecutorLogger;
  logs: string[];
}

export type ExecuteResult =
  | { ok: true; executed: number; logs: string[] }
  | { ok: false; executed: number; error: RepoSetupError; logs: string[] };
