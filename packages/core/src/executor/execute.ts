import path from "node:path";

import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { InstallationOperation } from "../operations/types.js";

import {
  executeAddEnvExample,
  executeCreateDirectory,
  executeCreateFile,
  executeModifyJson,
  executeModifyText,
} from "./file-operations.js";
import {
  executeCheckPrerequisite,
  executeInstallPackage,
  executeRunCommand,
  executeShowMessage,
  executeVerify,
} from "./process-operations.js";
import { preflightInstallation } from "./preflight.js";
import type { ExecuteOptions, ExecuteResult, ExecutionContext, ExecutorLogger } from "./types.js";

const silentLogger: ExecutorLogger = {
  info() {},
  verbose() {},
};

export async function executeInstallation(
  operations: readonly InstallationOperation[],
  options: ExecuteOptions,
): Promise<ExecuteResult> {
  const context: ExecutionContext = {
    rootDir: path.resolve(options.rootDir),
    fs: options.fs,
    runProcess: options.runProcess,
    logger: options.logger ?? silentLogger,
    logs: [],
  };

  if (options.commandExists !== undefined) {
    context.commandExists = options.commandExists;
  }
  if (options.signal !== undefined) {
    context.signal = options.signal;
  }
  if (options.commandTimeoutMs !== undefined) {
    context.commandTimeoutMs = options.commandTimeoutMs;
  }
  if (options.longRunningCommandTimeoutMs !== undefined) {
    context.longRunningCommandTimeoutMs = options.longRunningCommandTimeoutMs;
  }

  if (isCancelled(context)) {
    return abortedResult(0, context);
  }

  const preflightError = await preflightInstallation(operations, context);
  if (preflightError !== undefined) {
    return { ok: false, executed: 0, error: preflightError, logs: context.logs };
  }

  const acquired =
    options.executionLock === undefined
      ? undefined
      : await options.executionLock.acquire(context.rootDir);
  if (acquired !== undefined && !acquired.ok) {
    return {
      ok: false,
      executed: 0,
      error: createRepoSetupError({
        code: "EXECUTION_LOCKED",
        message:
          acquired.reason === "already_locked"
            ? "Another RepoSetup execution is already changing this project."
            : "RepoSetup could not reserve this project for safe execution.",
        details: { rootDir: context.rootDir, reason: acquired.reason },
        suggestion: "Wait for the other RepoSetup command to finish, then retry.",
      }),
      logs: context.logs,
    };
  }

  try {
    return await executeOperations(operations, context);
  } finally {
    await acquired?.handle.release();
  }
}

async function executeOperations(
  operations: readonly InstallationOperation[],
  context: ExecutionContext,
): Promise<ExecuteResult> {
  let executed = 0;
  for (const operation of operations) {
    if (operation.type !== "check_prerequisite") {
      continue;
    }

    if (isCancelled(context)) {
      return abortedResult(executed, context);
    }

    context.logger.info(operation.description);
    context.logs.push(operation.description);
    const error = await executeCheckPrerequisite(operation, context);
    if (error !== undefined) {
      return { ok: false, executed, error, logs: context.logs };
    }
    executed += 1;
  }

  for (const operation of operations) {
    if (operation.type === "check_prerequisite") {
      continue;
    }

    if (isCancelled(context)) {
      return abortedResult(executed, context);
    }

    context.logger.info(operation.description);
    context.logs.push(operation.description);

    const error = await executeOperation(operation, context);
    if (error !== undefined) {
      return {
        ok: false,
        executed,
        error,
        logs: context.logs,
      };
    }

    executed += 1;
  }

  return {
    ok: true,
    executed,
    logs: context.logs,
  };
}

function abortedResult(executed: number, context: ExecutionContext): ExecuteResult {
  return {
    ok: false,
    executed,
    error: createRepoSetupError({
      code: "EXECUTION_ABORTED",
      message: "Execution was cancelled before the next operation began.",
      suggestion: "Review completed changes before retrying the plan.",
    }),
    logs: context.logs,
  };
}

function isCancelled(context: ExecutionContext): boolean {
  return context.signal?.aborted === true;
}

async function executeOperation(
  operation: InstallationOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  switch (operation.type) {
    case "check_prerequisite":
      return executeCheckPrerequisite(operation, context);
    case "install_package":
      return executeInstallPackage(operation, context);
    case "run_command":
      return executeRunCommand(operation, context);
    case "create_directory":
      return executeCreateDirectory(operation, context);
    case "create_file":
      return executeCreateFile(operation, context);
    case "modify_json":
      return executeModifyJson(operation, context);
    case "modify_text":
      return executeModifyText(operation, context);
    case "add_env_example":
      return executeAddEnvExample(operation, context);
    case "show_message":
      return executeShowMessage(operation, context);
    case "verify":
      return executeVerify(operation, context);
    default: {
      const exhaustive: never = operation;
      return exhaustive;
    }
  }
}
