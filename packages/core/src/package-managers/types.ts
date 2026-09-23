import type { PackageManager, RuntimeId } from "../config/types.js";
import type { RepoSetupError } from "../errors/model.js";
import type { RunCommandOperation } from "../operations/types.js";
import type { ProjectRelativePath } from "../paths/project-path.js";

export interface AddPackagesRequest {
  packages: readonly string[];
  cwd: ProjectRelativePath;
  description: string;
  dev?: boolean;
  exact?: boolean;
  allowBuild?: readonly string[];
}

export interface InstallProjectRequest {
  cwd: ProjectRelativePath;
  description: string;
  requirementsFile?: ProjectRelativePath;
  /** Install only from the existing lockfile. Do not resolve or rewrite it. */
  frozen?: boolean;
  /** pnpm only: packages allowed to run lifecycle scripts during install. */
  allowBuild?: readonly string[];
}

export interface RemovePackagesRequest {
  packages: readonly string[];
  cwd: ProjectRelativePath;
  description: string;
}

export type PackageManagerCommandResult =
  { ok: true; operation: RunCommandOperation } | { ok: false; error: RepoSetupError };

export interface PackageManagerAdapter {
  readonly id: PackageManager;
  readonly runtimeId: RuntimeId;
  add(request: AddPackagesRequest): PackageManagerCommandResult;
  install(request: InstallProjectRequest): PackageManagerCommandResult;
  remove(request: RemovePackagesRequest): PackageManagerCommandResult;
}
