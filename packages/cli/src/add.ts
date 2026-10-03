import {
  executeInstallation,
  planAddMany,
  selectionFailure,
  type DeclarativeSelection,
  type PackageManager,
} from "@reposetup/core";

import { loadSelection, renderSelectionChoices } from "./selection.js";
import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";
import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
  DEFAULT_MINIMUM_FREE_DISK_BYTES,
} from "./execution-adapters.js";
import { formatError } from "./format-error.js";
import { renderErrorJson, renderPartialRunReport, renderPlanJson } from "./machine-output.js";
import { writeLine } from "./io.js";
import { isKnownPackageManager } from "./prompt-create.js";
import { renderPlan } from "./render-plan.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "./types.js";

export async function handleAdd(input: {
  integrationIds: readonly string[];
  selection?: string;
  config?: string;
  dryRun: boolean;
  yes: boolean;
  packageManager: string | undefined;
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
}): Promise<number> {
  let selection: Extract<DeclarativeSelection, { mode: "add" }> | undefined;
  const usingSelection = input.selection !== undefined || input.config !== undefined;
  if (usingSelection) {
    const conflict =
      (input.selection !== undefined && input.config !== undefined) ||
      input.integrationIds.length > 0 ||
      input.packageManager !== undefined ||
      input.yes;
    const loaded = conflict
      ? selectionFailure(
          "Add IDs, config and selection are mutually exclusive; selections also conflict with --package-manager and --yes.",
          "flags",
        )
      : await loadSelection({
          mode: "add",
          deps: input.deps,
          ...(input.selection === undefined ? {} : { token: input.selection }),
          ...(input.config === undefined ? {} : { file: input.config }),
        });
    if (!loaded.ok) {
      writeLine(
        input.deps.io.writeErr,
        input.globals.json ? renderErrorJson(loaded.error) : formatError(loaded.error),
      );
      return exitCodeForError(loaded.error);
    }
    if (loaded.selection.mode !== "add") return EXIT_CODES.INVALID_INPUT;
    selection = loaded.selection;
    renderSelectionChoices(selection, input.deps, input.globals);
  }
  const integrationIds = selection?.integrations.map((item) => item.id) ?? input.integrationIds;
  if (input.packageManager !== undefined && !isKnownPackageManager(input.packageManager)) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json
        ? renderErrorJson({
            code: "CONFIG_INVALID",
            message: `Unknown package manager "${input.packageManager}".`,
            details: { packageManager: input.packageManager },
            suggestion: "Use npm, pnpm, bun, uv, or pip.",
          })
        : formatError({
            code: "CONFIG_INVALID",
            message: `Unknown package manager "${input.packageManager}".`,
            details: { packageManager: input.packageManager },
            suggestion: "Use npm, pnpm, bun, uv, or pip.",
          }),
    );
    return EXIT_CODES.INVALID_INPUT;
  }

  const planningInput = {
    startDir: input.deps.cwd,
    integrationIds,
    ...(selection === undefined
      ? {}
      : { selections: selection.integrations, expectedContext: selection.context }),
    registry: input.deps.registry,
    ...(input.packageManager !== undefined && isKnownPackageManager(input.packageManager)
      ? { packageManager: input.packageManager as PackageManager }
      : {}),
  };
  const planned = await planAddMany(planningInput);

  if (!planned.ok) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(planned.error) : formatError(planned.error),
    );
    return exitCodeForError(planned.error);
  }

  const rendered = input.globals.json
    ? renderPlanJson(planned.result, input.dryRun)
    : renderPlan(planned.result, {
        dryRun: input.dryRun,
        verbose: input.globals.verbose,
        quiet: usingSelection ? false : input.globals.quiet,
      });

  if (!planned.result.valid) {
    writeLine(input.deps.io.writeErr, rendered);
    return exitCodeForErrors(planned.result.errors);
  }

  if (planned.result.operations.length === 0) {
    if (input.globals.json) {
      writeLine(input.deps.io.writeOut, rendered);
      return EXIT_CODES.SUCCESS;
    }
    if (!input.globals.quiet || usingSelection) {
      writeLine(
        input.deps.io.writeOut,
        integrationIds.length === 1
          ? `No changes. Integration "${integrationIds[0]}" is already present.`
          : `No changes. Requested integrations (${integrationIds.join(", ")}) are already present.`,
      );
      if (input.dryRun) {
        writeLine(input.deps.io.writeOut, "No files or commands were executed.");
      }
    }
    return EXIT_CODES.SUCCESS;
  }

  writeLine(input.deps.io.writeOut, rendered);

  if (input.dryRun) {
    return EXIT_CODES.SUCCESS;
  }

  if (!input.yes) {
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

  if (usingSelection) {
    const checked = await planAddMany(planningInput);
    if (
      !checked.ok ||
      !checked.result.valid ||
      checked.projectRoot !== planned.projectRoot ||
      JSON.stringify(checked.result.operations) !== JSON.stringify(planned.result.operations)
    ) {
      const error = selectionFailure(
        "The local selection plan changed during confirmation. Run it again to review the new plan.",
        "changed",
      ).error;
      writeLine(
        input.deps.io.writeErr,
        input.globals.json ? renderErrorJson(error) : formatError(error),
      );
      return exitCodeForError(error);
    }
  }
  const executionStartedAt = Date.now();
  const executed = await executeInstallation(planned.result.operations, {
    rootDir: planned.projectRoot,
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
            total: planned.result.operations.length,
          })
        : formatError(executed.error),
    );
    if (!input.globals.json) {
      writeLine(
        input.deps.io.writeErr,
        renderPartialRunReport(executed.executed, planned.result.operations.length),
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
  }

  return EXIT_CODES.SUCCESS;
}
