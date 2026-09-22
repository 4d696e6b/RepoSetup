import path from "node:path";

import type { RepoSetupError } from "../errors/model.js";
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

  let executed = 0;

  for (const operation of operations) {
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
