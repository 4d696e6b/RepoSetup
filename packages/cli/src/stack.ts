import { detectProject } from "@reposetup/core";

import { EXIT_CODES, exitCodeForError } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { writeLine } from "./io.js";
import { renderStack } from "./render-stack.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "./types.js";

export async function handleStack(input: {
  globals: GlobalCliOptions;
  deps: ResolvedCliDeps;
}): Promise<number> {
  const result = await detectProject({
    startDir: input.deps.cwd,
    registry: input.deps.registry,
  });

  if (!result.ok) {
    writeLine(input.deps.io.writeErr, formatError(result.error));
    return exitCodeForError(result.error);
  }

  if (input.globals.json) {
    writeLine(
      input.deps.io.writeOut,
      JSON.stringify({ version: 1, kind: "stack", stack: result.stack }),
    );
  } else {
    writeLine(input.deps.io.writeOut, renderStack(result.stack, input.globals.verbose));
  }
  return EXIT_CODES.SUCCESS;
}
