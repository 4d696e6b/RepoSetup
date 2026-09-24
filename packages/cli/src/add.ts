import { executeInstallation, planAddMany, type PackageManager } from "@reposetup/core";

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
  dryRun: boolean;
  yes: boolean;
  packageManager: string | undefined;
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
}): Promise<number> {
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

  const planned = await planAddMany({
    startDir: input.deps.cwd,
    integrationIds: input.integrationIds,
    registry: input.deps.registry,
    ...(input.packageManager !== undefined && isKnownPackageManager(input.packageManager)
      ? { packageManager: input.packageManager as PackageManager }
      : {}),
  });

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
        quiet: input.globals.quiet,
      });

  if (!planned.result.valid) {
    writeLine(input.deps.io.writeErr, rendered);
    return exitCodeForErrors(planned.result.errors);
  }

  if (planned.result.operations.length === 0) {
    if (!input.globals.quiet) {
      writeLine(
        input.deps.io.writeOut,
        input.integrationIds.length === 1
          ? `No changes. Integration "${input.integrationIds[0]}" is already present.`
          : `No changes. Requested integrations (${input.integrationIds.join(", ")}) are already present.`,
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
        "Aborted. Pass --yes to execute without a confirmation prompt.",
      );
      return EXIT_CODES.INVALID_INPUT;
    }
  }

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
    writeLine(input.deps.io.writeOut, `Executed ${executed.executed} operations.`);
  }

  return EXIT_CODES.SUCCESS;
}
