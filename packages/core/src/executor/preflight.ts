import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { InstallationOperation } from "../operations/types.js";

import {
  assertRealPathInsideRoot,
  nearestExistingAncestor,
  resolveInsideRoot,
} from "./resolve-path.js";
import type { ExecutionContext } from "./types.js";

export async function preflightInstallation(
  operations: readonly InstallationOperation[],
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  if (
    !(await context.fs.exists(context.rootDir)) ||
    !(await context.fs.isDirectory(context.rootDir))
  ) {
    return createRepoSetupError({
      code: "PROJECT_NOT_FOUND",
      message: `Project root "${context.rootDir}" does not exist or is not a directory.`,
      details: { rootDir: context.rootDir },
      suggestion: "Run RepoSetup from an existing project directory.",
    });
  }

  if (!(await context.fs.canWrite(context.rootDir))) {
    return nonWritableError(context.rootDir);
  }

  const lockfileError = await checkLockfileCompatibility(operations, context);
  if (lockfileError !== undefined) return lockfileError;

  const missingLockfile = await checkRequiredLockfile(operations, context);
  if (missingLockfile !== undefined) return missingLockfile;

  const diskError = await checkAvailableDiskSpace(context);
  if (diskError !== undefined) {
    return diskError;
  }

  for (const operation of operations) {
    const relativePath = operationPath(operation);
    if (relativePath === undefined) {
      continue;
    }

    const resolved = resolveInsideRoot(context.rootDir, relativePath);
    if (!resolved.ok) {
      return resolved.error;
    }

    const realPath = await assertRealPathInsideRoot(
      context.rootDir,
      resolved.absolutePath,
      context.fs,
    );
    if (!realPath.ok) {
      return realPath.error;
    }

    if (operationCanMutate(operation)) {
      const ancestor = await nearestExistingAncestor(resolved.absolutePath, context.fs);
      if (!(await context.fs.canWrite(ancestor))) {
        return nonWritableError(ancestor);
      }
    }
  }

  return undefined;
}

async function checkRequiredLockfile(
  operations: readonly InstallationOperation[],
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  for (const operation of operations) {
    if (operation.type !== "run_command" || operation.requiresLockfile === undefined) {
      continue;
    }

    const directory = resolveInsideRoot(context.rootDir, operation.cwd);
    if (!directory.ok) return directory.error;
    const realPath = await assertRealPathInsideRoot(
      context.rootDir,
      directory.absolutePath,
      context.fs,
    );
    if (!realPath.ok) return realPath.error;
    if (await context.fs.exists(`${directory.absolutePath}/${operation.requiresLockfile}`)) {
      continue;
    }

    return createRepoSetupError({
      code: "LOCKFILE_CONFLICT",
      message: `Locked install requires ${operation.requiresLockfile}, and that file is not in the project.`,
      details: { lockfile: operation.requiresLockfile },
      suggestion:
        "Restore the lockfile that belongs with this recipe record, then retry. RepoSetup will not resolve a new dependency graph.",
    });
  }

  return undefined;
}

function packageManagersInPlan(
  operations: readonly InstallationOperation[],
): Map<string, Set<string>> {
  const directories = new Map<string, Set<string>>();
  for (const operation of operations) {
    let manager: string | undefined;
    if (operation.type === "install_package") {
      manager = operation.packageManager;
    } else if (operation.type === "run_command") {
      // A scaffold that defers installation runs from the parent directory.
      // Its eventual install checks the actual destination instead.
      if (operation.skipsDependencyInstall === true || operation.args.includes("--skip-install"))
        continue;
      if (operation.command === "npm" || operation.command === "npx") manager = "npm";
      else if (operation.command === "pnpm") manager = "pnpm";
      else if (operation.command === "uv") manager = "uv";
    }
    if (manager !== undefined && "cwd" in operation) {
      const managers = directories.get(operation.cwd) ?? new Set<string>();
      managers.add(manager);
      directories.set(operation.cwd, managers);
    }
  }
  return directories;
}

async function checkLockfileCompatibility(
  operations: readonly InstallationOperation[],
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const directories = packageManagersInPlan(operations);
  const lockfiles = [
    { manager: "npm", file: "package-lock.json" },
    { manager: "pnpm", file: "pnpm-lock.yaml" },
    { manager: "bun", file: "bun.lock" },
    { manager: "uv", file: "uv.lock" },
  ] as const;
  for (const [cwd, managers] of directories) {
    const directory = resolveInsideRoot(context.rootDir, cwd);
    if (!directory.ok) return directory.error;
    const realPath = await assertRealPathInsideRoot(
      context.rootDir,
      directory.absolutePath,
      context.fs,
    );
    if (!realPath.ok) return realPath.error;
    for (const lockfile of lockfiles) {
      if (
        managers.size > 0 &&
        !managers.has(lockfile.manager) &&
        (await context.fs.exists(`${directory.absolutePath}/${lockfile.file}`))
      )
        return createRepoSetupError({
          code: "LOCKFILE_CONFLICT",
          message: `Found ${lockfile.file}, which conflicts with this plan's package manager.`,
          details: { lockfile: lockfile.file, cwd, managers: [...managers] },
          suggestion:
            "Use the package manager recorded by the existing lockfile or remove the conflicting lockfile deliberately.",
        });
    }
  }
  return undefined;
}

function operationCanMutate(operation: InstallationOperation): boolean {
  return operation.type !== "check_prerequisite" && operation.type !== "show_message";
}

function nonWritableError(target: string): RepoSetupError {
  return createRepoSetupError({
    code: "FILE_MUTATION_FAILED",
    message: `RepoSetup cannot write to "${target}".`,
    details: { path: target, reason: "not writable" },
    suggestion: "Choose a writable project directory and re-run the plan.",
  });
}

async function checkAvailableDiskSpace(
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  if (context.minimumFreeDiskBytes === undefined) {
    return undefined;
  }
  if (context.minimumFreeDiskBytes < 0) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: "Minimum free disk space cannot be negative.",
      details: { minimumFreeDiskBytes: context.minimumFreeDiskBytes },
      suggestion: "Use a non-negative disk-space threshold.",
    });
  }
  if (context.fs.availableDiskBytes === undefined) {
    return createRepoSetupError({
      code: "FILE_MUTATION_FAILED",
      message: "RepoSetup cannot determine available disk space for this project.",
      details: { path: context.rootDir },
      suggestion: "Use a supported filesystem and re-run the plan.",
    });
  }

  let availableBytes: number;
  try {
    availableBytes = await context.fs.availableDiskBytes(context.rootDir);
  } catch (error) {
    return createRepoSetupError({
      code: "FILE_MUTATION_FAILED",
      message: "RepoSetup cannot determine available disk space for this project.",
      details: {
        path: context.rootDir,
        reason: error instanceof Error ? error.message : "disk-space check failed",
      },
      suggestion: "Use a supported filesystem and re-run the plan.",
    });
  }

  if (availableBytes >= context.minimumFreeDiskBytes) {
    return undefined;
  }

  return createRepoSetupError({
    code: "FILE_MUTATION_FAILED",
    message: "RepoSetup does not have enough free disk space to execute this plan.",
    details: {
      availableBytes,
      minimumFreeDiskBytes: context.minimumFreeDiskBytes,
      path: context.rootDir,
    },
    suggestion: "Free disk space or choose another project directory, then re-run the plan.",
  });
}

function operationPath(operation: InstallationOperation): string | undefined {
  switch (operation.type) {
    case "install_package":
    case "run_command":
    case "verify":
      return operation.cwd;
    case "create_directory":
    case "create_file":
    case "modify_json":
    case "modify_text":
    case "add_env_example":
      return operation.path;
    case "check_prerequisite":
    case "show_message":
      return undefined;
    default: {
      const exhaustive: never = operation;
      return exhaustive;
    }
  }
}
