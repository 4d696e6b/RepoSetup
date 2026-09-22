import {
  executeInstallation,
  parseRepoSetupConfig,
  planInstallation,
  type PackageManager,
  type RepoSetupConfig,
  type RepoSetupError,
  type RuntimeId,
} from "@reposetup/core";

import { configFromAnswers } from "./config-from-answers.js";
import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
  DEFAULT_MINIMUM_FREE_DISK_BYTES,
} from "./execution-adapters.js";
import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { writeLine } from "./io.js";
import { loadRepoSetupConfigFile } from "./load-config.js";
import { isKnownPackageManager } from "./prompt-create.js";
import { renderPlan } from "./render-plan.js";
import type {
  CreateAnswers,
  CreateCommandOptions,
  GlobalCliOptions,
  ResolvedCliDeps,
} from "./types.js";

export async function handleCreate(input: {
  name: string | undefined;
  options: CreateCommandOptions;
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
}): Promise<number> {
  const loaded = await resolveCreateConfig(input);
  if (!loaded.ok) {
    writeLine(input.deps.io.writeErr, formatError(loaded.error));
    return exitCodeForError(loaded.error);
  }

  const planned = planInstallation(loaded.config, input.deps.registry);
  const rendered = renderPlan(planned, {
    dryRun: input.options.dryRun,
    verbose: input.globals.verbose,
    quiet: input.globals.quiet,
  });

  if (!planned.valid) {
    writeLine(input.deps.io.writeErr, rendered);
    return exitCodeForErrors(planned.errors);
  }

  writeLine(input.deps.io.writeOut, rendered);

  if (input.options.dryRun) {
    return EXIT_CODES.SUCCESS;
  }

  if (!input.options.yes) {
    const proceed = await input.deps.confirmCreate();
    if (!proceed) {
      writeLine(
        input.deps.io.writeErr,
        "Aborted. Pass --yes to execute without a confirmation prompt.",
      );
      return EXIT_CODES.INVALID_INPUT;
    }
  }

  const executed = await executeInstallation(planned.operations, {
    rootDir: input.deps.cwd,
    fs: input.deps.executorFs,
    runProcess: input.deps.runProcess,
    executionLock: input.deps.executionLock,
    executionJournal: input.deps.executionJournal,
    ...(input.deps.signal === undefined ? {} : { signal: input.deps.signal }),
    commandTimeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
    longRunningCommandTimeoutMs: DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
    minimumFreeDiskBytes: DEFAULT_MINIMUM_FREE_DISK_BYTES,
    logger: {
      info(message) {
        if (!input.globals.quiet) {
          writeLine(input.deps.io.writeOut, message);
        }
      },
      verbose(message) {
        if (input.globals.verbose) {
          writeLine(input.deps.io.writeOut, message);
        }
      },
      ...(input.globals.verbose && !input.globals.quiet
        ? {
            output(message: string) {
              input.deps.io.writeOut(message);
            },
          }
        : {}),
    },
    ...(input.deps.commandExists === undefined ? {} : { commandExists: input.deps.commandExists }),
  });

  if (!executed.ok) {
    writeLine(input.deps.io.writeErr, formatError(executed.error));
    return exitCodeForError(executed.error);
  }

  if (!input.globals.quiet) {
    writeLine(input.deps.io.writeOut, `Executed ${executed.executed} operations.`);
  }

  return EXIT_CODES.SUCCESS;
}

async function resolveCreateConfig(input: {
  name: string | undefined;
  options: CreateCommandOptions;
  deps: ResolvedCliDeps;
}): Promise<{ ok: true; config: RepoSetupConfig } | { ok: false; error: RepoSetupError }> {
  if (input.options.config !== undefined) {
    return loadRepoSetupConfigFile(input.options.config, input.deps);
  }

  if (canBuildFromFlags(input.name, input.options)) {
    return parseAnswers(
      answersFromFlags({
        name: input.name as string,
        options: input.options,
      }),
    );
  }

  try {
    const answers = await input.deps.promptCreate({
      registry: input.deps.registry,
      ...(input.name === undefined ? {} : { projectName: input.name }),
      ...(input.options.framework === undefined ? {} : { frameworkId: input.options.framework }),
      ...(input.options.packageManager !== undefined &&
      isKnownPackageManager(input.options.packageManager)
        ? { packageManager: input.options.packageManager }
        : {}),
      ...(input.options.typescript ? { typescript: true } : {}),
    });
    return parseAnswers(answers);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "CONFIG_INVALID",
        message: error instanceof Error ? error.message : "Interactive create failed.",
        suggestion: "Pass --config or provide --framework and a project name.",
      },
    };
  }
}

function canBuildFromFlags(name: string | undefined, options: CreateCommandOptions): boolean {
  return name !== undefined && options.framework !== undefined;
}

function answersFromFlags(input: { name: string; options: CreateCommandOptions }): CreateAnswers {
  const packageManager = parsePackageManager(input.options.packageManager);
  const runtimeId = runtimeForPackageManager(packageManager);
  const answers: CreateAnswers = {
    projectName: input.name,
    projectPath: input.name,
    runtimeId,
    packageManager,
    frameworkId: input.options.framework as string,
    integrations: [],
  };

  if (input.options.typescript) {
    answers.frameworkOptions = { typescript: true };
  }

  return answers;
}

function parseAnswers(
  answers: CreateAnswers,
): { ok: true; config: RepoSetupConfig } | { ok: false; error: RepoSetupError } {
  const parsed = parseRepoSetupConfig(configFromAnswers(answers));
  if (!parsed.success) {
    return { ok: false, error: parsed.error };
  }

  return { ok: true, config: parsed.config };
}

function parsePackageManager(value: string | undefined): PackageManager {
  if (value !== undefined && isKnownPackageManager(value)) {
    return value;
  }

  return "pnpm";
}

function runtimeForPackageManager(packageManager: PackageManager): RuntimeId {
  if (packageManager === "uv" || packageManager === "pip") {
    return "python";
  }

  return "node";
}
