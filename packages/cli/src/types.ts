import type {
  IntegrationSelection,
  PackageManager,
  ExecutorFileSystem,
  ExecutionLock,
  ExecutionJournal,
  ExecutableResolver,
  ProcessRunner,
  RuntimeId,
} from "@reposetup/core";
import type { IntegrationRegistry } from "@reposetup/registry";

export interface CliIo {
  writeOut(text: string): void;
  writeErr(text: string): void;
}

export interface CliFs {
  readFile(path: string): Promise<string>;
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
  registry?: IntegrationRegistry;
  io?: CliIo;
  fs?: CliFs;
  promptCreate?: (context: PromptCreateContext) => Promise<CreateAnswers>;
  confirmCreate?: () => Promise<boolean>;
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
  registry: IntegrationRegistry;
  io: CliIo;
  fs: CliFs;
  promptCreate: (context: PromptCreateContext) => Promise<CreateAnswers>;
  confirmCreate: () => Promise<boolean>;
  executorFs: ExecutorFileSystem;
  runProcess: ProcessRunner;
  executionLock: ExecutionLock;
  executionJournal: ExecutionJournal;
  commandExists: (command: string) => Promise<boolean>;
  resolveExecutable: ExecutableResolver;
  signal?: AbortSignal;
  cwd: string;
}

export interface CliResult {
  exitCode: number;
}

export interface GlobalCliOptions {
  verbose: boolean;
  quiet: boolean;
}

export interface CreateCommandOptions {
  config?: string;
  preset?: string;
  dryRun: boolean;
  yes: boolean;
  framework?: string;
  packageManager?: string;
  typescript: boolean;
}
