import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { toPackageManagerCommand } from "../package-managers/lookup.js";
import type {
  CheckPrerequisiteOperation,
  InstallPackageOperation,
  RunCommandOperation,
  ShowMessageOperation,
  VerifyOperation,
} from "../operations/types.js";

import { isSafeExecutableName, isSafeProcessArg } from "./command-name.js";
import { resolveInsideRoot } from "./resolve-path.js";
import type { ExecutionContext, ProcessRunResult } from "./types.js";

const PREREQUISITES: Record<string, { command: string; hint: string }> = {
  node: {
    command: "node",
    hint: "Install Node.js 20.9 or later from https://nodejs.org and ensure it is on PATH.",
  },
  npm: {
    command: "npm",
    hint: "Install Node.js, which includes npm, and ensure npm is on PATH.",
  },
  pnpm: {
    command: "pnpm",
    hint: "Install pnpm from https://pnpm.io/installation and ensure it is on PATH.",
  },
};

export async function executeCheckPrerequisite(
  operation: CheckPrerequisiteOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const spec = PREREQUISITES[operation.id];
  if (spec === undefined) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: `Unknown prerequisite "${operation.id}".`,
      details: { id: operation.id },
      suggestion:
        "Phase 8 checks node, npm, and pnpm only. Do not install system software automatically.",
    });
  }

  const exists =
    context.commandExists === undefined
      ? await binaryExists(spec.command, context)
      : await context.commandExists(spec.command);

  if (!exists) {
    return createRepoSetupError({
      code: "PREREQUISITE_MISSING",
      message: `${spec.command} was not found on PATH.`,
      details: { id: operation.id, command: spec.command },
      suggestion: spec.hint,
    });
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
  const commandError = validateCommand(operation.command, operation.args);
  if (commandError !== undefined) {
    return commandError;
  }

  const cwd = resolveInsideRoot(context.rootDir, operation.cwd);
  if (!cwd.ok) {
    return cwd.error;
  }

  context.logger.verbose(`${operation.command} ${operation.args.join(" ")}`);

  const result = await context.runProcess({
    command: operation.command,
    args: operation.args,
    cwd: cwd.absolutePath,
  });

  return commandFailure(operation.command, operation.args, result);
}

export async function executeVerify(
  operation: VerifyOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  if (operation.command === undefined) {
    return undefined;
  }

  const args = operation.args ?? [];
  const commandError = validateCommand(operation.command, args);
  if (commandError !== undefined) {
    return commandError;
  }

  const cwd = resolveInsideRoot(context.rootDir, operation.cwd);
  if (!cwd.ok) {
    return cwd.error;
  }

  context.logger.verbose(`${operation.command} ${args.join(" ")}`);

  const result = await context.runProcess({
    command: operation.command,
    args,
    cwd: cwd.absolutePath,
  });

  const failed = commandFailure(operation.command, args, result);
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

async function binaryExists(command: string, context: ExecutionContext): Promise<boolean> {
  const result = await context.runProcess({
    command,
    args: ["--version"],
    cwd: context.rootDir,
  });

  return result.notFound !== true && result.exitCode === 0;
}

function commandFailure(
  command: string,
  args: readonly string[],
  result: ProcessRunResult,
): RepoSetupError | undefined {
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

  return createRepoSetupError({
    code: "COMMAND_FAILED",
    message: `Command "${command}" exited with code ${result.exitCode}.`,
    details: {
      command,
      args: [...args],
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    },
    suggestion: "Inspect the command output, fix the project, and re-run the plan.",
  });
}
