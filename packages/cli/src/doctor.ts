import { errorsFromDoctor, failedDoctorChecks, runDoctor } from "@reposetup/core";
import { lstat } from "node:fs/promises";
import path from "node:path";

import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { renderErrorJson } from "./machine-output.js";
import { writeLine } from "./io.js";
import { renderDoctor } from "./render-doctor.js";
import { loadRepoSetupConfigFile } from "./load-config.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "./types.js";

export async function handleDoctor(input: {
  configPath?: string;
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
  commandVersion?: (command: string) => Promise<string | undefined>;
}): Promise<number> {
  const loaded =
    input.configPath === undefined
      ? undefined
      : await loadRepoSetupConfigFile(input.configPath, input.deps);
  if (loaded !== undefined && !loaded.ok) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(loaded.error) : formatError(loaded.error),
    );
    return exitCodeForError(loaded.error);
  }
  const config = loaded?.ok === true ? loaded.config : undefined;
  const targetDir =
    config?.project.path === undefined
      ? input.deps.cwd
      : path.resolve(input.deps.cwd, config.project.path);
  if (config?.project.path !== undefined && config.project.path !== ".") {
    const symlink = await hasSymlinkComponent(input.deps.cwd, config.project.path);
    if (symlink) {
      const error = {
        code: "CONFIG_INVALID" as const,
        message: "Intended project path crosses a symlink.",
        suggestion: "Use a direct path to the project directory.",
      };
      writeLine(
        input.deps.io.writeErr,
        input.globals.json ? renderErrorJson(error) : formatError(error),
      );
      return exitCodeForError(error);
    }
  }
  const result = await runDoctor({
    startDir: targetDir,
    registry: input.deps.registry,
    commandExists: input.deps.commandExists,
    resolveExecutable: input.deps.resolveExecutable,
    ...(input.commandVersion === undefined ? {} : { commandVersion: input.commandVersion }),
    ...(config === undefined ? {} : { expectedConfig: config }),
  });

  if (!result.ok) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(result.error) : formatError(result.error),
    );
    return exitCodeForError(result.error);
  }

  if (
    config?.project.path !== undefined &&
    config.project.path !== "." &&
    path.resolve(result.result.projectRoot) !== targetDir
  ) {
    const error = {
      code: "CONFIG_INVALID" as const,
      message: "The intended project path does not identify a project root.",
      suggestion:
        "Run doctor from the correct parent directory or use a config for the current project.",
    };
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(error) : formatError(error),
    );
    return exitCodeForError(error);
  }

  const failed = failedDoctorChecks(result.result);
  if (input.globals.json) {
    writeLine(
      input.deps.io.writeOut,
      JSON.stringify({ version: 1, kind: "doctor", result: result.result, failed: failed.length }),
    );
  } else {
    const rendered = renderDoctor(result.result, input.globals);
    if (rendered.length > 0) writeLine(input.deps.io.writeOut, rendered);
  }
  if (failed.length === 0) {
    return EXIT_CODES.SUCCESS;
  }

  return exitCodeForErrors(errorsFromDoctor(result.result));
}

async function hasSymlinkComponent(root: string, relativePath: string): Promise<boolean> {
  let current = path.resolve(root);
  for (const segment of relativePath.replaceAll("\\", "/").split("/")) {
    if (segment === ".") continue;
    current = path.join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) return true;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
        return false;
      throw error;
    }
  }
  return false;
}
