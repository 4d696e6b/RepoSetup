import { executeInstallation, planAdd, type PackageManager } from "@reposetup/core";

import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";
import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
} from "./execution-adapters.js";
import { formatError } from "./format-error.js";
import { writeLine } from "./io.js";
import { isKnownPackageManager } from "./prompt-create.js";
import { renderPlan } from "./render-plan.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "./types.js";

export async function handleAdd(input: {
  integrationId: string;
  dryRun: boolean;
  yes: boolean;
  packageManager: string | undefined;
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
}): Promise<number> {
  if (input.packageManager !== undefined && !isKnownPackageManager(input.packageManager)) {
    writeLine(
      input.deps.io.writeErr,
      formatError({
        code: "CONFIG_INVALID",
        message: `Unknown package manager "${input.packageManager}".`,
        details: { packageManager: input.packageManager },
        suggestion: "Use npm, pnpm, bun, uv, or pip.",
      }),
    );
    return EXIT_CODES.INVALID_INPUT;
  }

  const planned = await planAdd({
    startDir: input.deps.cwd,
    integrationId: input.integrationId,
    registry: input.deps.registry,
    ...(input.packageManager !== undefined && isKnownPackageManager(input.packageManager)
      ? { packageManager: input.packageManager as PackageManager }
      : {}),
  });

  if (!planned.ok) {
    writeLine(input.deps.io.writeErr, formatError(planned.error));
    return exitCodeForError(planned.error);
  }

  const rendered = renderPlan(planned.result, {
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
        `No changes. Integration "${input.integrationId}" is already present.`,
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
    executionLock: input.deps.executionLock,
    executionJournal: input.deps.executionJournal,
    ...(input.deps.signal === undefined ? {} : { signal: input.deps.signal }),
    commandTimeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
    longRunningCommandTimeoutMs: DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
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
