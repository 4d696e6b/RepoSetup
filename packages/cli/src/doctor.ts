import {
  createNodeDetectionFs,
  errorsFromDoctor,
  executeInstallation,
  failedDoctorChecks,
  planDoctorRepair,
  runDoctor,
  validateInstallationPlan,
  type DoctorResult,
  type RepoSetupConfig,
} from "@reposetup/core";
import { lstat } from "node:fs/promises";
import path from "node:path";

import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { renderErrorJson } from "./machine-output.js";
import { writeLine } from "./io.js";
import { renderDoctor } from "./render-doctor.js";
import { capturePreview, previewError, recheckPreview, renderPreview } from "./preview.js";
import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
  DEFAULT_MINIMUM_FREE_DISK_BYTES,
} from "./execution-adapters.js";
import { loadRepoSetupConfigFile } from "./load-config.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "./types.js";

export async function handleDoctor(input: {
  configPath?: string;
  fix?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
  commandVersion?: (command: string) => Promise<string | undefined>;
}): Promise<number> {
  if (
    ((input.dryRun || input.yes) && !input.fix) ||
    (input.fix && input.configPath === undefined)
  ) {
    const error = {
      code: "CONFIG_INVALID" as const,
      message: input.fix
        ? "doctor --fix requires --config with an intended schemaVersion 1 stack."
        : "doctor --dry-run and --yes require --fix.",
      suggestion: "Use doctor --fix --config reposetup.json --dry-run to review eligible repairs.",
    };
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(error) : formatError(error),
    );
    return exitCodeForError(error);
  }
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

  if (input.fix && config !== undefined) {
    return handleRepair(input, config, result.result);
  }
  return writeDoctorResult(input, result.result);
}

function writeDoctorResult(
  input: { globals: GlobalCliOptions; deps: ResolvedCliDeps },
  doctor: DoctorResult,
  repair?: {
    planned: number;
    executed: number;
    manual: string[];
    dryRun: boolean;
    preview?: unknown;
  },
): number {
  const failed = failedDoctorChecks(doctor);
  if (input.globals.json) {
    writeLine(
      input.deps.io.writeOut,
      JSON.stringify({
        version: 1,
        kind: "doctor",
        result: doctor,
        failed: failed.length,
        ...(repair === undefined ? {} : { repair }),
      }),
    );
  } else {
    const rendered = renderDoctor(doctor, input.globals);
    if (rendered.length > 0) writeLine(input.deps.io.writeOut, rendered);
    if (repair !== undefined) {
      writeLine(
        input.deps.io.writeOut,
        `Repair: ${repair.executed}/${repair.planned} file operations executed${repair.dryRun ? " (dry run)" : ""}.`,
      );
      for (const guidance of repair.manual)
        writeLine(input.deps.io.writeOut, `Manual action: ${guidance}`);
    }
  }
  if (failed.length === 0) {
    return EXIT_CODES.SUCCESS;
  }

  return exitCodeForErrors(errorsFromDoctor(doctor));
}

async function handleRepair(
  input: {
    globals: GlobalCliOptions;
    deps: ResolvedCliDeps;
    commandVersion?: (command: string) => Promise<string | undefined>;
    configPath?: string;
    dryRun?: boolean;
    yes?: boolean;
  },
  config: RepoSetupConfig,
  doctor: DoctorResult,
): Promise<number> {
  const planned = await planDoctorRepair({
    config,
    doctor,
    registry: input.deps.registry,
    files: createNodeDetectionFs(doctor.projectRoot),
  });
  const validated = validateInstallationPlan(planned.operations);
  if (!validated.valid) {
    const error = validated.errors[0];
    if (error !== undefined) {
      writeLine(
        input.deps.io.writeErr,
        input.globals.json ? renderErrorJson(error) : formatError(error),
      );
      return exitCodeForError(error);
    }
  }
  let captured;
  try {
    captured = await capturePreview(doctor.projectRoot, planned.operations);
  } catch (cause) {
    const error = previewError("read", cause instanceof Error ? cause.message : undefined);
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(error) : formatError(error),
    );
    return exitCodeForError(error);
  }
  if (captured.preview.blocked) {
    const error = previewError("blocked");
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(error, undefined, captured.preview) : formatError(error),
    );
    return exitCodeForError(error);
  }
  const repair = {
    planned: planned.operations.length,
    executed: 0,
    manual: planned.manual,
    dryRun: input.dryRun === true,
    preview: captured.preview,
  };
  if (input.dryRun || planned.operations.length === 0) {
    if (!input.globals.json) writeLine(input.deps.io.writeOut, renderPreview(captured.preview));
    return writeDoctorResult(input, doctor, repair);
  }
  if (input.globals.json) {
    writeLine(
      input.deps.io.writeErr,
      JSON.stringify({ version: 1, kind: "doctor-repair-preview", repair }),
    );
  } else {
    writeLine(input.deps.io.writeOut, renderPreview(captured.preview));
  }
  if (!input.yes && !(await input.deps.confirmCreate("Create the reviewed repair files?"))) {
    const error = {
      code: "CONFIG_INVALID" as const,
      message: "Repair aborted. Pass --yes to confirm without a prompt.",
      suggestion: "Review doctor --fix --dry-run, then confirm the repair.",
    };
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(error) : formatError(error),
    );
    return exitCodeForError(error);
  }
  const changed = await recheckPreview(doctor.projectRoot, planned.operations, captured);
  if (changed !== undefined) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(changed) : formatError(changed),
    );
    return exitCodeForError(changed);
  }
  const currentConfig = await loadRepoSetupConfigFile(input.configPath ?? "", input.deps);
  const fresh = currentConfig.ok
    ? await runDoctor({
        startDir: doctor.projectRoot,
        registry: input.deps.registry,
        commandExists: input.deps.commandExists,
        resolveExecutable: input.deps.resolveExecutable,
        expectedConfig: currentConfig.config,
        ...(input.commandVersion === undefined ? {} : { commandVersion: input.commandVersion }),
      })
    : undefined;
  const freshPlan = fresh?.ok
    ? await planDoctorRepair({
        config: currentConfig.ok ? currentConfig.config : config,
        doctor: fresh.result,
        files: createNodeDetectionFs(doctor.projectRoot),
        registry: input.deps.registry,
      })
    : undefined;
  if (
    !currentConfig.ok ||
    JSON.stringify(currentConfig.config) !== JSON.stringify(config) ||
    !fresh?.ok ||
    JSON.stringify(freshPlan?.operations) !== JSON.stringify(planned.operations)
  ) {
    const error = previewError("changed");
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(error) : formatError(error),
    );
    return exitCodeForError(error);
  }
  const executed = await executeInstallation(planned.operations, {
    rootDir: doctor.projectRoot,
    fs: input.deps.executorFs,
    runProcess: input.deps.runProcess,
    resolveExecutable: input.deps.resolveExecutable,
    executionLock: input.deps.executionLock,
    executionJournal: input.deps.executionJournal,
    ...(input.deps.signal === undefined ? {} : { signal: input.deps.signal }),
    commandTimeoutMs: DEFAULT_COMMAND_TIMEOUT_MS,
    longRunningCommandTimeoutMs: DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS,
    minimumFreeDiskBytes: DEFAULT_MINIMUM_FREE_DISK_BYTES,
    commandExists: input.deps.commandExists,
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
    return exitCodeForError(executed.error);
  }
  const checked = await runDoctor({
    startDir: doctor.projectRoot,
    registry: input.deps.registry,
    commandExists: input.deps.commandExists,
    resolveExecutable: input.deps.resolveExecutable,
    expectedConfig: config,
    ...(input.commandVersion === undefined ? {} : { commandVersion: input.commandVersion }),
  });
  if (!checked.ok) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(checked.error) : formatError(checked.error),
    );
    return exitCodeForError(checked.error);
  }
  return writeDoctorResult(input, checked.result, {
    ...repair,
    executed: executed.executed,
    dryRun: false,
  });
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
