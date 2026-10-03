import path from "node:path";
import {
  decodeSelection,
  parseSelectionJson,
  selectionFailure,
  SELECTION_LIMITS,
  type SelectionResult,
  type DeclarativeSelection,
} from "@reposetup/core";
import { BEGINNER_CATALOG } from "@reposetup/integrations";
import { validateSelection } from "@reposetup/registry";
import { writeLine } from "./io.js";
import type { ResolvedCliDeps, GlobalCliOptions } from "./types.js";

export async function loadSelection(input: {
  token?: string;
  file?: string;
  mode: "create" | "add";
  deps: ResolvedCliDeps;
}): Promise<SelectionResult> {
  let parsed: SelectionResult;
  if (input.token !== undefined) parsed = decodeSelection(input.token);
  else if (input.file !== undefined) {
    try {
      const filePath = path.resolve(input.deps.cwd, input.file);
      const text =
        input.deps.fs.readBoundedFile === undefined
          ? await input.deps.fs.readFile(filePath)
          : await input.deps.fs.readBoundedFile(filePath, SELECTION_LIMITS.fileBytes);
      parsed = parseSelectionJson(text);
    } catch {
      return selectionFailure(
        "Could not read selection file as bounded UTF-8 JSON (maximum 16 KiB).",
        "file",
      );
    }
  } else return selectionFailure("Provide a selection token or file.", "input");
  if (!parsed.ok) return parsed;
  if (parsed.selection.mode !== input.mode)
    return selectionFailure("Selection mode does not match the CLI command.", "mode");
  return validateSelection(parsed.selection, input.deps.registry, BEGINNER_CATALOG);
}

export function renderSelectionChoices(
  selection: DeclarativeSelection,
  deps: ResolvedCliDeps,
  globals: GlobalCliOptions,
): void {
  // Keep the existing JSON plan envelope on stdout; readable confirmation context goes to stderr.
  writeLine(
    globals.json ? deps.io.writeErr : deps.io.writeOut,
    `Decoded selection (${selection.mode}, catalog ${selection.catalogRevision}):\n${JSON.stringify(selection.mode === "create" ? selection.config : { context: selection.context, integrations: selection.integrations }, null, 2)}\nChoices contain public data, never secrets. Review the local plan before confirming.`,
  );
}
