import { errorsFromDoctor, failedDoctorChecks, runDoctor } from "@reposetup/core";

import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { renderErrorJson } from "./machine-output.js";
import { writeLine } from "./io.js";
import { renderDoctor } from "./render-doctor.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "./types.js";

export async function handleDoctor(input: {
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
  commandVersion?: (command: string) => Promise<string | undefined>;
}): Promise<number> {
  const result = await runDoctor({
    startDir: input.deps.cwd,
    registry: input.deps.registry,
    commandExists: input.deps.commandExists,
    ...(input.commandVersion === undefined ? {} : { commandVersion: input.commandVersion }),
  });

  if (!result.ok) {
    writeLine(
      input.deps.io.writeErr,
      input.globals.json ? renderErrorJson(result.error) : formatError(result.error),
    );
    return exitCodeForError(result.error);
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
