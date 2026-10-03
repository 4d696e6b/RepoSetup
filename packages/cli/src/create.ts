import {
  executeInstallation,
  selectionFailure,
  parseSelection,
  parseRepoSetupConfig,
  planInstallation,
  planSelectionCreate,
  type PackageManager,
  type RepoSetupConfig,
  type RepoSetupError,
  type RuntimeId,
} from "@reposetup/core";
import path from "node:path";

import { loadSelection, renderSelectionChoices } from "./selection.js";
import { BEGINNER_CATALOG } from "@reposetup/integrations";
import { findBundledPreset } from "./presets.js";

import { configFromAnswers } from "./config-from-answers.js";
import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
  DEFAULT_MINIMUM_FREE_DISK_BYTES,
} from "./execution-adapters.js";
import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { renderErrorJson, renderPartialRunReport, renderPlanJson } from "./machine-output.js";
import { writeLine } from "./io.js";
import { loadRepoSetupConfigFile } from "./load-config.js";
import { postCreateCommands } from "./post-create.js";
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
  const usingSelection =
    input.options.selection !== undefined || input.options.selectionFile !== undefined;
  const modes = [
    input.options.config,
    input.options.preset,
    input.options.selection,
    input.options.selectionFile,
  ].filter((value) => value !== undefined);
  const conflict =
    modes.length > 1 ||
    (usingSelection &&
      (input.name !== undefined ||
        input.options.framework !== undefined ||
        input.options.packageManager !== undefined ||
        input.options.typescript ||
        input.options.yes));
  let loaded: { ok: true; config: RepoSetupConfig } | { ok: false; error: RepoSetupError };
  if (conflict)
    loaded = selectionFailure(
      "Create config, preset, token and file modes are mutually exclusive; selections also conflict with names, framework/manager/TypeScript overrides and --yes.",
      "flags",
    );
  else if (usingSelection) {
    const selection = await loadSelection({
      mode: "create",
      deps: input.deps,
      ...(input.options.selection === undefined ? {} : { token: input.options.selection }),
      ...(input.options.selectionFile === undefined ? {} : { file: input.options.selectionFile }),
    });
    if (selection.ok && selection.selection.mode === "create") {
      renderSelectionChoices(selection.selection, input.deps, input.globals);
      loaded = { ok: true, config: selection.selection.config };
    } else loaded = selection.ok ? selectionFailure("Wrong selection mode.", "mode") : selection;
  } else loaded = await resolveCreateConfig(input);
  if (!loaded.ok) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(loaded.error) : formatError(loaded.error),
    );
    return exitCodeForError(loaded.error);
  }

  const planned = (
    usingSelection || input.options.preset?.startsWith("beginner-")
      ? planSelectionCreate
      : planInstallation
  )(loaded.config, input.deps.registry);
  const rendered = input.globals.json
    ? renderPlanJson(planned, input.options.dryRun)
    : renderPlan(planned, {
        dryRun: input.options.dryRun,
        verbose: input.globals.verbose,
        quiet: usingSelection ? false : input.globals.quiet,
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
        usingSelection
          ? "Aborted. Selection execution requires interactive confirmation. Use --dry-run to preview without a TTY."
          : "Aborted. Pass --yes to execute without a confirmation prompt.",
      );
      return EXIT_CODES.INVALID_INPUT;
    }
  }

  const executionStartedAt = Date.now();
  const executed = await executeInstallation(planned.operations, {
    rootDir: input.deps.cwd,
    fs: input.deps.executorFs,
    runProcess: input.deps.runProcess,
    resolveExecutable: input.deps.resolveExecutable,
    executionLock: input.deps.executionLock,
    executionJournal: input.deps.executionJournal,
    ...(input.deps.signal === undefined ? {} : { signal: input.deps.signal }),
    commandTimeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
    longRunningCommandTimeoutMs: DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
    minimumFreeDiskBytes: DEFAULT_MINIMUM_FREE_DISK_BYTES,
    logger: {
      info(message) {
        if (!input.globals.quiet) {
          writeLine(input.globals.json ? input.deps.io.writeErr : input.deps.io.writeOut, message);
        }
      },
      verbose(message) {
        if (input.globals.verbose) {
          writeLine(input.globals.json ? input.deps.io.writeErr : input.deps.io.writeOut, message);
        }
      },
      ...(input.globals.verbose && !input.globals.quiet
        ? {
            output(message: string) {
              (input.globals.json ? input.deps.io.writeErr : input.deps.io.writeOut)(message);
            },
          }
        : {}),
    },
    ...(input.deps.commandExists === undefined ? {} : { commandExists: input.deps.commandExists }),
  });

  if (!executed.ok) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json
        ? renderErrorJson(executed.error, {
            completed: executed.executed,
            total: planned.operations.length,
          })
        : formatError(executed.error),
    );
    if (!input.globals.json) {
      writeLine(
        input.deps.io.writeErr,
        renderPartialRunReport(executed.executed, planned.operations.length),
      );
    }
    return exitCodeForError(executed.error);
  }

  if (!input.globals.quiet) {
    const elapsedSeconds = ((Date.now() - executionStartedAt) / 1000).toFixed(1);
    writeLine(
      input.globals.json ? input.deps.io.writeErr : input.deps.io.writeOut,
      `Executed ${executed.executed} operations.`,
    );
    writeLine(
      input.globals.json ? input.deps.io.writeErr : input.deps.io.writeOut,
      `Elapsed: ${elapsedSeconds}s.`,
    );
    writeLine(
      input.globals.json ? input.deps.io.writeErr : input.deps.io.writeOut,
      `Project directory: ${path.resolve(input.deps.cwd, planned.config.project.path ?? ".")}`,
    );
    for (const command of postCreateCommands(planned.config)) {
      writeLine(
        input.globals.json ? input.deps.io.writeErr : input.deps.io.writeOut,
        `Next: ${command}`,
      );
    }
  }

  return EXIT_CODES.SUCCESS;
}

async function resolveCreateConfig(input: {
  name: string | undefined;
  options: CreateCommandOptions;
  deps: ResolvedCliDeps;
}): Promise<{ ok: true; config: RepoSetupConfig } | { ok: false; error: RepoSetupError }> {
  if (input.options.config !== undefined)
    return loadRepoSetupConfigFile(input.options.config, input.deps);
  if (input.options.preset !== undefined) {
    const preset = findBundledPreset(input.options.preset);
    if (preset === undefined)
      return {
        ok: false,
        error: {
          code: "CONFIG_INVALID",
          message: `Unknown preset "${input.options.preset}". Run "reposetup presets" to list bundled presets.`,
          suggestion: "Choose one of the listed preset IDs.",
        },
      };
    const config = structuredClone(preset.config);
    if (input.name !== undefined) {
      config.project.name = input.name;
      if (preset.id.startsWith("beginner-")) config.project.path = input.name;
    }
    if (preset.id.startsWith("beginner-")) {
      const parsed = parseSelection({
        selectionVersion: 1,
        catalogRevision: BEGINNER_CATALOG.revision,
        cliContract: BEGINNER_CATALOG.cliContract,
        mode: "create",
        config,
      });
      if (!parsed.ok) return parsed;
    }
    return { ok: true, config };
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
