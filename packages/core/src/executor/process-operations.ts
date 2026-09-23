import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { toPackageManagerCommand } from "../package-managers/lookup.js";
import type {
  CheckPrerequisiteOperation,
  InstallPackageOperation,
  RunCommandOperation,
  ShowMessageOperation,
  VerifyOperation,
} from "../operations/types.js";

import { pathPrerequisite } from "../prerequisites/path.js";

import { isSafeExecutableName, isSafeProcessArg } from "./command-name.js";
import { commandFailureSuggestion, summarizeFailedProcessOutput } from "./output-snippet.js";
import { assertRealPathInsideRoot, resolveInsideRoot } from "./resolve-path.js";
import type { ExecutionContext, ProcessRunRequest, ProcessRunResult } from "./types.js";

export async function executeCheckPrerequisite(
  operation: CheckPrerequisiteOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const spec = pathPrerequisite(operation.id);
  if (spec === undefined) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: `Unknown prerequisite "${operation.id}".`,
      details: { id: operation.id },
      suggestion:
        "PATH checks cover node, npm, pnpm, python, uv, and pip. Do not install system software automatically.",
    });
  }

  const command = await resolveExecutable(spec.command, context);
  if (command === undefined) {
    return createRepoSetupError({
      code: "PREREQUISITE_MISSING",
      message: `${spec.command} was not found on PATH.`,
      details: { id: operation.id, command: spec.command },
      suggestion: spec.hint,
    });
  }

  const exists =
    context.commandExists === undefined
      ? await binaryExists(command, context)
      : await context.commandExists(command);

  if (!exists) {
    return createRepoSetupError({
      code: "PREREQUISITE_MISSING",
      message: `${command} was not found on PATH.`,
      details: { id: operation.id, command },
      suggestion: spec.hint,
    });
  }

  if (spec.minimumVersion !== undefined) {
    const version = await readCommandVersion(command, context);
    if (version === undefined || isVersionBelow(version, spec.minimumVersion)) {
      return createRepoSetupError({
        code: "PREREQUISITE_MISSING",
        message: `${command} does not meet the required version ${formatVersion(spec.minimumVersion)} or later.`,
        details: {
          id: operation.id,
          command,
          ...(version === undefined ? {} : { detectedVersion: formatVersion(version) }),
          minimumVersion: formatVersion(spec.minimumVersion),
        },
        suggestion: spec.hint,
      });
    }
  }

  return undefined;
}

export async function executeInstallPackage(
  operation: InstallPackageOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const command = toPackageManagerCommand(operation);
  if (!command.ok) {
    return command.error;
  }

  return executeRunCommand(command.operation, context);
}

export async function executeRunCommand(
  operation: RunCommandOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const command = await resolveExecutable(operation.command, context);
  if (command === undefined) {
    return missingCommand(operation.command);
  }
  const commandError = validateCommand(command, operation.args);
  if (commandError !== undefined) {
    return commandError;
  }

  const cwd = resolveInsideRoot(context.rootDir, operation.cwd);
  if (!cwd.ok) {
    return cwd.error;
  }
  const realPath = await assertRealPathInsideRoot(context.rootDir, cwd.absolutePath, context.fs);
  if (!realPath.ok) {
    return realPath.error;
  }

  context.logger.verbose(`${command} ${operation.args.join(" ")}`);

  const result = await context.runProcess({
    command,
    args: operation.args,
    cwd: cwd.absolutePath,
    ...(context.signal === undefined ? {} : { signal: context.signal }),
    ...outputHandler(context),
    ...timeoutFor(operation, context),
  });

  return commandFailure(command, operation.args, result, context);
}

export async function executeVerify(
  operation: VerifyOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  if (operation.command === undefined) {
    return undefined;
  }

  const args = operation.args ?? [];
  const command = await resolveExecutable(operation.command, context);
  if (command === undefined) {
    return missingCommand(operation.command);
  }
  const commandError = validateCommand(command, args);
  if (commandError !== undefined) {
    return commandError;
  }

  const cwd = resolveInsideRoot(context.rootDir, operation.cwd);
  if (!cwd.ok) {
    return cwd.error;
  }
  const realPath = await assertRealPathInsideRoot(context.rootDir, cwd.absolutePath, context.fs);
  if (!realPath.ok) {
    return realPath.error;
  }

  context.logger.verbose(`${command} ${args.join(" ")}`);

  const result = await context.runProcess({
    command,
    args,
    cwd: cwd.absolutePath,
    ...(context.signal === undefined ? {} : { signal: context.signal }),
    ...outputHandler(context),
    ...timeoutFor(operation, context),
  });

  const failed = commandFailure(command, args, result, context);
  if (failed === undefined) {
    return undefined;
  }

  return createRepoSetupError({
    code: "VERIFICATION_FAILED",
    message: failed.message,
    ...(failed.details === undefined ? {} : { details: failed.details }),
    suggestion:
      "The planned verification command failed. Inspect the project and re-run doctor later.",
  });
}

export function executeShowMessage(
  operation: ShowMessageOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  context.logger.info(operation.message);
  context.logs.push(operation.message);
  return Promise.resolve(undefined);
}

function validateCommand(command: string, args: readonly string[]): RepoSetupError | undefined {
  if (!isSafeExecutableName(command)) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: `Command "${command}" is not a safe executable name.`,
      details: { command },
      suggestion: "Pass a single executable name and put flags in the args array.",
    });
  }

  for (const arg of args) {
    if (!isSafeProcessArg(arg)) {
      return createRepoSetupError({
        code: "PLAN_INVALID",
        message: "A command argument contained a NUL byte.",
        details: { command },
        suggestion: "Pass command arguments as a string array without NUL characters.",
      });
    }
  }

  return undefined;
}

async function resolveExecutable(
  command: string,
  context: ExecutionContext,
): Promise<string | undefined> {
  return context.resolveExecutable === undefined ? command : context.resolveExecutable(command);
}

function missingCommand(command: string): RepoSetupError {
  return createRepoSetupError({
    code: "COMMAND_FAILED",
    message: `Command "${command}" was not found.`,
    details: { command },
    suggestion:
      "Install the executable and ensure it is on PATH. RepoSetup will not install it for you.",
  });
}

async function binaryExists(command: string, context: ExecutionContext): Promise<boolean> {
  const result = await context.runProcess({
    command,
    args: ["--version"],
    cwd: context.rootDir,
  });

  return result.notFound !== true && result.exitCode === 0;
}

async function readCommandVersion(
  command: string,
  context: ExecutionContext,
): Promise<readonly [number, number, number] | undefined> {
  const result = await context.runProcess({
    command,
    args: ["--version"],
    cwd: context.rootDir,
  });
  if (result.notFound === true || result.exitCode !== 0) {
    return undefined;
  }

  const match = `${result.stdout}\n${result.stderr}`.match(
    /(?:v|Python\s+)?(\d+)\.(\d+)(?:\.(\d+))?/i,
  );
  if (match === null) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

function isVersionBelow(
  actual: readonly [number, number, number],
  minimum: readonly [number, number, number],
): boolean {
  for (const index of [0, 1, 2] as const) {
    if (actual[index] !== minimum[index]) {
      return actual[index] < minimum[index];
    }
  }
  return false;
}

function formatVersion(version: readonly [number, number, number]): string {
  return version.join(".");
}

function commandFailure(
  command: string,
  args: readonly string[],
  result: ProcessRunResult,
  context: ExecutionContext,
): RepoSetupError | undefined {
  if (result.aborted === true) {
    return createRepoSetupError({
      code: "EXECUTION_ABORTED",
      message: `Command "${command}" was cancelled.`,
      details: { command, args: [...args] },
      suggestion: "Review completed changes before retrying the plan.",
    });
  }

  if (result.timedOut === true) {
    return createRepoSetupError({
      code: "COMMAND_TIMED_OUT",
      message: `Command "${command}" exceeded its execution time limit.`,
      details: { command, args: [...args] },
      suggestion: "Check network, package-manager, and project state before retrying the plan.",
    });
  }

  if (result.notFound === true) {
    return createRepoSetupError({
      code: "COMMAND_FAILED",
      message: `Command "${command}" was not found.`,
      details: { command, args: [...args] },
      suggestion:
        "Install the executable and ensure it is on PATH. RepoSetup will not install it for you.",
    });
  }

  if (result.exitCode === 0) {
    return undefined;
  }

  const snippet = summarizeFailedProcessOutput(result.stdout, result.stderr);
  if (snippet !== undefined) {
    context.logger.info(snippet);
    context.logs.push(snippet);
  }

  const summary = `Command "${command}" exited with code ${result.exitCode}.`;
  return createRepoSetupError({
    code: "COMMAND_FAILED",
    message: snippet === undefined ? summary : `${summary}\n${snippet}`,
    details: {
      command,
      args: [...args],
      exitCode: result.exitCode,
    },
    suggestion: commandFailureSuggestion(snippet),
  });
}

function timeoutFor(
  operation: RunCommandOperation | VerifyOperation,
  context: ExecutionContext,
): { timeoutMs?: number } {
  const timeoutMs =
    operation.type === "run_command" && operation.longRunning === true
      ? context.longRunningCommandTimeoutMs
      : context.commandTimeoutMs;

  return timeoutMs === undefined ? {} : { timeoutMs };
}

function outputHandler(context: ExecutionContext): Pick<ProcessRunRequest, "onOutput"> {
  if (context.logger.output === undefined) {
    return {};
  }

  return { onOutput: (event) => context.logger.output?.(event.text) };
}
