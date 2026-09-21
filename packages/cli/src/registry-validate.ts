import { EXIT_CODES, exitCodeForErrors } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { writeLine } from "./io.js";
import type { ResolvedCliDeps } from "./types.js";

export function handleRegistryValidate(deps: ResolvedCliDeps): number {
  const result = deps.registry.validate();
  if (result.valid) {
    writeLine(deps.io.writeOut, `Registry is valid (${deps.registry.list().length} integrations).`);
    return EXIT_CODES.SUCCESS;
  }

  for (const error of result.errors) {
    writeLine(deps.io.writeErr, formatError(error));
  }

  return exitCodeForErrors(result.errors);
}
