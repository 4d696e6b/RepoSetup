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
