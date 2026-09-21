import type { PackageManager, RuntimeId } from "../config/types.js";
import type { RepoSetupError } from "../errors/model.js";
import type { RunCommandOperation } from "../operations/types.js";
import type { ProjectRelativePath } from "../paths/project-path.js";

export interface AddPackagesRequest {
  packages: readonly string[];
  cwd: ProjectRelativePath;
  description: string;
  dev?: boolean;
}

export interface InstallProjectRequest {
  cwd: ProjectRelativePath;
  description: string;
  requirementsFile?: ProjectRelativePath;
}

export type PackageManagerCommandResult =
  { ok: true; operation: RunCommandOperation } | { ok: false; error: RepoSetupError };

export interface PackageManagerAdapter {
  readonly id: PackageManager;
  readonly runtimeId: RuntimeId;
  add(request: AddPackagesRequest): PackageManagerCommandResult;
  install(request: InstallProjectRequest): PackageManagerCommandResult;
}
