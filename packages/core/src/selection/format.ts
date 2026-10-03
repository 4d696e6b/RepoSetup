import { TextDecoder } from "node:util";
import * as z from "zod";

import type { RepoSetupConfig, IntegrationSelection } from "../config/types.js";
import { repoSetupConfigSchema, integrationSelectionSchema } from "../config/schema.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";

export const SELECTION_LIMITS = {
  tokenCharacters: 4096,
  tokenBytes: 3072,
  fileBytes: 16384,
  depth: 8,
  integrations: 16,
  commandCharacters: 4200,
} as const;
export const SELECTION_CLI_CONTRACT = "selection-v1";

export const selectionContextSchema = z.strictObject({
  runtimeId: z.enum(["node", "python"]),
  frameworkId: z.string().min(1).max(64),
  packageManager: z.enum(["pnpm", "uv"]),
  typescript: z.boolean().optional(),
});
export type SelectionContext = z.infer<typeof selectionContextSchema>;

const common = {
  selectionVersion: z.literal(1),
  catalogRevision: z.string().min(1).max(64),
  cliContract: z.literal(SELECTION_CLI_CONTRACT),
};
export const selectionSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    ...common,
    mode: z.literal("create"),
    config: repoSetupConfigSchema.transform((config) => config as RepoSetupConfig),
  }),
  z.strictObject({
    ...common,
    mode: z.literal("add"),
    context: selectionContextSchema,
    integrations: z
      .array(integrationSelectionSchema.transform((item) => item as IntegrationSelection))
      .min(1)
      .max(SELECTION_LIMITS.integrations),
  }),
]);
export type DeclarativeSelection = z.infer<typeof selectionSchema>;
export type SelectionResult =
  { ok: true; selection: DeclarativeSelection } | { ok: false; error: RepoSetupError };

export function selectionFailure(message: string, reason: string): SelectionResult & { ok: false } {
  return {
    ok: false,
    error: createRepoSetupError({
      code: "SELECTION_INVALID",
      message,
      details: { reason },
      suggestion:
        "Use a selection exported for this CLI catalog, or review the selection contract.",
    }),
  };
}

export function parseSelectionJson(
  text: string,
  maxBytes: number = SELECTION_LIMITS.fileBytes,
): SelectionResult {
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return selectionFailure("Selection exceeds the decoded size limit.", "size");
  }
  // Bound nesting before JSON.parse allocates nested structures. Ignore braces in strings.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{" || char === "[") {
      if (++depth > SELECTION_LIMITS.depth) {
        return selectionFailure("Selection exceeds the nesting limit.", "depth");
      }
    } else if (char === "}" || char === "]") depth--;
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return selectionFailure("Selection is not valid JSON.", "json");
  }
  return parseSelection(value);
}

export function parseSelection(value: unknown): SelectionResult {
  const parsed = selectionSchema.safeParse(value);
  if (!parsed.success)
    return selectionFailure("Selection has an unsupported version or invalid structure.", "schema");
  const selection = parsed.data;
  const integrations =
    selection.mode === "create" ? selection.config.integrations : selection.integrations;
  if (
    integrations.length > SELECTION_LIMITS.integrations ||
    new Set(integrations.map((item) => item.id)).size !== integrations.length
  ) {
    return selectionFailure("Selection contains too many or duplicate integrations.", "count");
  }
  if (selection.mode === "create") {
    const { project, runtime } = selection.config;
    const safeSegment = (value: string) =>
      /^[a-z][a-z0-9-]{0,63}$/.test(value) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(value);
    if (
      !safeSegment(project.name) ||
      (project.path !== undefined &&
        (project.path.length > 256 || !project.path.split("/").every(safeSegment)))
    ) {
      return selectionFailure(
        "Selection project name/path must use lowercase safe path segments.",
        "project",
      );
    }
    if (runtime.version !== undefined)
      return selectionFailure("Selection cannot override runtime versions.", "runtime");
  }
  return { ok: true, selection };
}

export function decodeSelection(token: string): SelectionResult {
  if (token.length > SELECTION_LIMITS.tokenCharacters)
    return selectionFailure("Selection token exceeds 4096 characters. Use the file route.", "size");
  if (!/^[A-Za-z0-9_-]+$/.test(token) || token.length % 4 === 1)
    return selectionFailure("Selection must be canonical unpadded base64url.", "encoding");
  const bytes = Buffer.from(token, "base64url");
  if (bytes.length > SELECTION_LIMITS.tokenBytes)
    return selectionFailure("Selection exceeds 3072 decoded bytes.", "size");
  if (bytes.toString("base64url") !== token)
    return selectionFailure("Selection encoding is not canonical.", "encoding");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return selectionFailure("Selection is not valid UTF-8.", "utf8");
  }
  return parseSelectionJson(text, SELECTION_LIMITS.tokenBytes);
}

export function encodeSelection(selection: DeclarativeSelection): string {
  const parsed = parseSelection(selection);
  if (!parsed.ok) throw parsed.error;
  const token = Buffer.from(JSON.stringify(parsed.selection), "utf8").toString("base64url");
  const decoded = decodeSelection(token);
  if (!decoded.ok) throw decoded.error;
  return token;
}

export function selectionCommand(selection: DeclarativeSelection, dryRun = false): string {
  const command = `reposetup ${selection.mode} --selection ${encodeSelection(selection)}${dryRun ? " --dry-run" : ""}`;
  if (command.length > SELECTION_LIMITS.commandCharacters)
    throw selectionFailure("Selection command is too long. Use the file route.", "size").error;
  return command;
}
