import type { PackageManager } from "../config/types.js";
import type { ProjectRelativePath } from "../paths/project-path.js";

export const FILE_WRITE_BEHAVIORS = ["fail_if_exists", "create_if_missing", "overwrite"] as const;

export type FileWriteBehavior = (typeof FILE_WRITE_BEHAVIORS)[number];

export interface CheckPrerequisiteOperation {
  type: "check_prerequisite";
  id: string;
  description: string;
  versionRange?: string;
}

export interface InstallPackageOperation {
  type: "install_package";
  packageManager: PackageManager;
  packages: string[];
  cwd: ProjectRelativePath;
  description: string;
  dev?: boolean;
  exact?: boolean;
  allowBuild?: string[];
  requiresNetwork?: boolean;
}

export interface RunCommandOperation {
  type: "run_command";
  command: string;
  args: string[];
  cwd: ProjectRelativePath;
  description: string;
  requiresNetwork?: boolean;
  interactive?: boolean;
  longRunning?: boolean;
  requiresLockfile?: "package-lock.json" | "pnpm-lock.yaml" | "bun.lock" | "uv.lock";
}

export interface CreateDirectoryOperation {
  type: "create_directory";
  path: ProjectRelativePath;
  behavior: "fail_if_exists" | "create_if_missing";
  description: string;
}

export interface CreateFileOperation {
  type: "create_file";
  path: ProjectRelativePath;
  content: string;
  behavior: FileWriteBehavior;
  description: string;
}

export interface ModifyJsonOperation {
  type: "modify_json";
  path: ProjectRelativePath;
  merge: Record<string, unknown>;
  behavior: "merge";
  description: string;
}

export interface ModifyTextOperation {
  type: "modify_text";
  path: ProjectRelativePath;
  oldText: string;
  newText: string;
  description: string;
}

export interface AddEnvExampleOperation {
  type: "add_env_example";
  path: ProjectRelativePath;
  entries: Array<{
    key: string;
    placeholder: string;
  }>;
  description: string;
}

export interface ShowMessageOperation {
  type: "show_message";
  message: string;
  description: string;
}

export interface VerifyOperation {
  type: "verify";
  cwd: ProjectRelativePath;
  description: string;
  command?: string;
  args?: string[];
}

export type InstallationOperation =
  | CheckPrerequisiteOperation
  | InstallPackageOperation
  | RunCommandOperation
  | CreateDirectoryOperation
  | CreateFileOperation
  | ModifyJsonOperation
  | ModifyTextOperation
  | AddEnvExampleOperation
  | ShowMessageOperation
  | VerifyOperation;
