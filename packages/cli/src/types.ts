import type {
  IntegrationSelection,
  PackageManager,
  ExecutorFileSystem,
  ExecutionLock,
  ExecutionJournal,
  ExecutableResolver,
  ProcessRunner,
  RuntimeId,
  TaskRepositoryReader,
  TaskSelector,
  TaskParseResult,
} from "@reposetup/core";
import type { IntegrationRegistry } from "@reposetup/registry";

export interface CliIo {
  writeOut(text: string): void;
  writeErr(text: string): void;
}

export interface CliFs {
  readFile(path: string): Promise<string>;
  readBoundedFile?(path: string, maxBytes: number): Promise<string>;
}

export interface CreateAnswers {
  projectName: string;
  projectPath?: string;
  runtimeId: RuntimeId;
  packageManager: PackageManager;
  frameworkId: string;
  frameworkOptions?: Record<string, unknown>;
  integrations: IntegrationSelection[];
}

export interface PromptCreateContext {
  registry: IntegrationRegistry;
  projectName?: string;
  runtimeId?: RuntimeId;
  packageManager?: PackageManager;
  frameworkId?: string;
  typescript?: boolean;
}

export interface CliDeps {
  createTaskRepository?: TaskRepositoryFactory;
  registry?: IntegrationRegistry;
  io?: CliIo;
  fs?: CliFs;
  promptCreate?: (context: PromptCreateContext) => Promise<CreateAnswers>;
  confirmCreate?: (message?: string) => Promise<boolean>;
  executorFs?: ExecutorFileSystem;
  runProcess?: ProcessRunner;
  executionLock?: ExecutionLock;
  executionJournal?: ExecutionJournal;
  commandExists?: (command: string) => Promise<boolean>;
  resolveExecutable?: ExecutableResolver;
  signal?: AbortSignal;
  cwd?: string;
}

export interface ResolvedCliDeps {
  createTaskRepository: TaskRepositoryFactory;
  registry: IntegrationRegistry;
  io: CliIo;
  fs: CliFs;
  promptCreate: (context: PromptCreateContext) => Promise<CreateAnswers>;
  confirmCreate: (message?: string) => Promise<boolean>;
  executorFs: ExecutorFileSystem;
  runProcess: ProcessRunner;
  executionLock: ExecutionLock;
  executionJournal: ExecutionJournal;
  commandExists: (command: string) => Promise<boolean>;
  resolveExecutable: ExecutableResolver;
  signal?: AbortSignal;
  cwd: string;
}

export type TaskRepositoryFactory = (
  root: string,
  authority: { read: TaskSelector[]; deny: TaskSelector[] },
) => Promise<TaskParseResult<TaskRepositoryReader & { rootIdentity: string }>>;

export interface CliResult {
  exitCode: number;
}

export interface GlobalCliOptions {
  verbose: boolean;
  quiet: boolean;
  json?: boolean;
}

export interface CreateCommandOptions {
  diff?: boolean;
  selection?: string;
  selectionFile?: string;
  config?: string;
  preset?: string;
  dryRun: boolean;
  yes: boolean;
  framework?: string;
  packageManager?: string;
  typescript: boolean;
}
