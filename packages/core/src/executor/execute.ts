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
import { journalEntryForOperation } from "./journal.js";
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
  if (options.minimumFreeDiskBytes !== undefined) {
    context.minimumFreeDiskBytes = options.minimumFreeDiskBytes;
  }
  if (options.onEvent !== undefined) {
    context.onEvent = options.onEvent;
  }
  if (options.executionJournal !== undefined) {
    context.executionJournal = options.executionJournal;
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
    await recordJournalStart(context);
    const result = await executeOperations(operations, context);
    await recordJournalFinish(context, result.ok ? "succeeded" : "failed");
    return result;
  } finally {
    await acquired?.handle.release();
  }
}

async function executeOperations(
  operations: readonly InstallationOperation[],
  context: ExecutionContext,
): Promise<ExecuteResult> {
  let executed = 0;
  for (const [index, operation] of operations.entries()) {
    if (operation.type !== "check_prerequisite") {
      continue;
    }

    if (isCancelled(context)) {
      return abortedResult(executed, context);
    }

    const error = await executeTrackedOperation(
      operation,
      index,
      context,
      executeCheckPrerequisite,
    );
    if (error !== undefined) {
      return { ok: false, executed, error, logs: context.logs };
    }
    executed += 1;
  }

  for (const [index, operation] of operations.entries()) {
    if (operation.type === "check_prerequisite") {
      continue;
    }

    if (isCancelled(context)) {
      return abortedResult(executed, context);
    }

    const error = await executeTrackedOperation(operation, index, context, executeOperation);
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

async function executeTrackedOperation<T extends InstallationOperation>(
  operation: T,
  index: number,
  context: ExecutionContext,
  execute: (operation: T, context: ExecutionContext) => Promise<RepoSetupError | undefined>,
): Promise<RepoSetupError | undefined> {
  const startedAt = Date.now();
  context.onEvent?.({
    type: "operation_started",
    index,
    operationType: operation.type,
    description: operation.description,
  });
  await recordJournal(context, journalEntryForOperation({ operation, index, status: "started" }));
  context.logger.info(operation.description);
  context.logs.push(operation.description);

  const error = await execute(operation, context);
  const durationMs = Date.now() - startedAt;
  if (error !== undefined) {
    context.onEvent?.({
      type: "operation_failed",
      index,
      operationType: operation.type,
      description: operation.description,
      durationMs,
      errorCode: error.code,
    });
    await recordJournal(
      context,
      journalEntryForOperation({
        operation,
        index,
        status: "failed",
        durationMs,
        errorCode: error.code,
      }),
    );
    return error;
  }

  context.onEvent?.({
    type: "operation_succeeded",
    index,
    operationType: operation.type,
    description: operation.description,
    durationMs,
  });
  await recordJournal(
    context,
    journalEntryForOperation({ operation, index, status: "succeeded", durationMs }),
  );
  return undefined;
}

async function recordJournalStart(context: ExecutionContext): Promise<void> {
  await context.executionJournal?.start(context.rootDir).catch(() => undefined);
}

async function recordJournal(
  context: ExecutionContext,
  entry: import("./types.js").ExecutionJournalEntry,
): Promise<void> {
  await context.executionJournal?.record(entry).catch(() => undefined);
}

async function recordJournalFinish(
  context: ExecutionContext,
  outcome: "succeeded" | "failed",
): Promise<void> {
  await context.executionJournal?.finish(outcome).catch(() => undefined);
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
