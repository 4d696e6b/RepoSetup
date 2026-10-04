import type { DeclarativeSelection } from "@reposetup/core";
import type { WebsiteCatalog } from "@reposetup/registry";

export type Choice = {
  contextId: string;
  mode: "create" | "add";
  ids: string[];
  name: string;
  path: string;
};
const safeSegment = (value: string) =>
  /^[a-z][a-z0-9-]{0,63}$/.test(value) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(value);

/** Errors for the public project controls; add never consumes hidden create fields. */
export function projectChoiceErrors(choice: Choice): { name?: string; path?: string } {
  if (choice.mode === "add") return {};
  const errors: { name?: string; path?: string } = {};
  if (!safeSegment(choice.name))
    errors.name =
      "Use a lowercase project name starting with a letter, followed by letters, digits or hyphens (up to 64 characters). Reserved device names are unavailable.";
  if (choice.path.length > 256 || !choice.path.split("/").every(safeSegment))
    errors.path =
      "Use relative folder segments like projects/my-app. Each segment must be a lowercase name; use at most 256 characters. Reserved device names are unavailable.";
  return errors;
}

/** Select an already planner-validated variant; no browser compatibility resolver. */
export function chooseSelection(catalog: WebsiteCatalog, choice: Choice): DeclarativeSelection {
  if (new Set(choice.ids).size !== choice.ids.length) throw new Error("Choose each library once.");
  const variant = catalog.variants.find(
    (item) =>
      item.contextId === choice.contextId &&
      item.ids.length === choice.ids.length &&
      item.ids.every((id) => choice.ids.includes(id)),
  );
  if (!variant)
    throw new Error("These choices are outside the reviewed context. Choose a supported preset.");
  if (choice.mode === "add") {
    if (!variant.add)
      throw new Error("Choose at least one optional library to add to your existing project.");
    return structuredClone(variant.add);
  }
  const errors = projectChoiceErrors(choice);
  if (errors.name) throw new Error(errors.name);
  if (errors.path) throw new Error(errors.path);
  const selection = structuredClone(variant.create);
  if (selection.mode !== "create") throw new Error("Invalid generated variant.");
  selection.config.project = { name: choice.name, path: choice.path };
  return selection;
}

export function exportSelection(
  selection: DeclarativeSelection,
  limits: { [K in keyof WebsiteCatalog["limits"]]: number },
  json = JSON.stringify(selection),
) {
  // This is a transport encoder, not an importer. Only generated, validated selections reach it.
  if (JSON.stringify(JSON.parse(json)) !== JSON.stringify(selection))
    throw new Error("File must contain the reviewed selection.");
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > limits.fileBytes)
    throw new Error("Selection exceeds the validated file limit.");
  const token = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const command = `reposetup ${selection.mode} --selection ${token}`;
  const fits =
    bytes.length <= limits.tokenBytes &&
    token.length <= limits.tokenCharacters &&
    command.length + " --dry-run".length <= limits.commandCharacters;
  const fileCommand = `reposetup ${selection.mode} ${selection.mode === "create" ? "--selection-file" : "--config"} selection.json`;
  return {
    json,
    command: fits ? command : null,
    preview: fits ? `${command} --dry-run` : `${fileCommand} --dry-run`,
    fileCommand,
    bytes: bytes.length,
  };
}
