import { errorsFromDoctor, failedDoctorChecks, runDoctor } from "@reposetup/core";

import { EXIT_CODES, exitCodeForError, exitCodeForErrors } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { writeLine } from "./io.js";
import { renderDoctor } from "./render-doctor.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "./types.js";

export async function handleDoctor(input: {
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
}): Promise<number> {
  const result = await runDoctor({
    startDir: input.deps.cwd,
    registry: input.deps.registry,
    ...(input.deps.commandExists === undefined ? {} : { commandExists: input.deps.commandExists }),
  });

  if (!result.ok) {
    writeLine(input.deps.io.writeErr, formatError(result.error));
    return exitCodeForError(result.error);
  }

  const rendered = renderDoctor(result.result, input.globals);
  if (rendered.length > 0) {
    writeLine(input.deps.io.writeOut, rendered);
  }

  const failed = failedDoctorChecks(result.result);
  if (failed.length === 0) {
    return EXIT_CODES.SUCCESS;
  }

  return exitCodeForErrors(errorsFromDoctor(result.result));
}
