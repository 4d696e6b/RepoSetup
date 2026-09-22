import { access, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createRepoSetupError,
  exportProject,
  serializeRepoSetupConfig,
  type PackageManager,
} from "@reposetup/core";

import { EXIT_CODES, exitCodeForError } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { writeLine } from "./io.js";
import { isKnownPackageManager } from "./prompt-create.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "./types.js";

const EXPORT_FILE_NAME = "reposetup.json";

export async function handleExport(input: {
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

  const exported = await exportProject({
    startDir: input.deps.cwd,
    registry: input.deps.registry,
    ...(input.packageManager !== undefined && isKnownPackageManager(input.packageManager)
      ? { packageManager: input.packageManager as PackageManager }
      : {}),
  });

  if (!exported.ok) {
    writeLine(input.deps.io.writeErr, formatError(exported.error));
    return exitCodeForError(exported.error);
  }

  const json = serializeRepoSetupConfig(exported.config);

  if (input.dryRun) {
    writeLine(input.deps.io.writeOut, json.trimEnd());
    if (!input.globals.quiet) {
      writeLine(input.deps.io.writeOut, `Would write ${EXPORT_FILE_NAME}.`);
      writeLine(input.deps.io.writeOut, "No files or commands were executed.");
    }
    return EXIT_CODES.SUCCESS;
  }

  const outputPath = path.join(exported.projectRoot, EXPORT_FILE_NAME);
  if (!input.yes && (await fileExists(outputPath))) {
    writeLine(
      input.deps.io.writeErr,
      formatError(
        createRepoSetupError({
          code: "FILE_ALREADY_EXISTS",
          message: `${EXPORT_FILE_NAME} already exists.`,
          details: { path: EXPORT_FILE_NAME },
          suggestion: "Pass --yes to overwrite, or --dry-run to print the config.",
        }),
      ),
    );
    return exitCodeForError({
      code: "FILE_ALREADY_EXISTS",
      message: `${EXPORT_FILE_NAME} already exists.`,
    });
  }

  await writeFile(outputPath, json, "utf8");
  if (!input.globals.quiet) {
    writeLine(input.deps.io.writeOut, `Wrote ${EXPORT_FILE_NAME}.`);
  }
  return EXIT_CODES.SUCCESS;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
