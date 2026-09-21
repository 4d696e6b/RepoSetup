import {
  createRepoSetupError,
  type IntegrationDefinition,
  type IntegrationRef,
} from "@reposetup/core";

import { EXIT_CODES, exitCodeForError } from "./exit-codes.js";
import { formatError } from "./format-error.js";
import { writeLine } from "./io.js";
import type { ResolvedCliDeps } from "./types.js";

export function handleInfo(input: { id: string; deps: ResolvedCliDeps }): number {
  const definition = input.deps.registry.get(input.id);
  if (definition === undefined) {
    const error = createRepoSetupError({
      code: "UNKNOWN_INTEGRATION",
      message: `Integration "${input.id}" is not in the registry.`,
      details: { integrationId: input.id },
      suggestion: "Run reposetup search to list available integrations.",
    });
    writeLine(input.deps.io.writeErr, formatError(error));
    return exitCodeForError(error);
  }

  writeLine(input.deps.io.writeOut, formatInfo(definition));
  return EXIT_CODES.SUCCESS;
}

function formatInfo(definition: IntegrationDefinition): string {
  const lines = [
    definition.id,
    `  name              ${definition.name}`,
    `  category          ${definition.category}`,
    `  status            ${definition.status}`,
    `  description       ${definition.description}`,
    `  requirements      ${formatRefs(definition.requirements?.map((item) => item.target))}`,
    `  recommendations   ${formatRefs(definition.recommendations?.map((item) => item.target))}`,
    `  conflicts         ${formatRefs(definition.conflicts?.map((item) => item.target))}`,
    `  options           ${definition.optionSchema === undefined ? "none" : "schema provided"}`,
    `  supports          checked at resolve time against runtime, package manager, and framework`,
    `  verified          ${definition.verification?.verifiedAt ?? "not recorded"}`,
    `  addable           ${definition.addable === true ? "yes" : "no"}`,
    `  removable         ${definition.removable === true ? "yes" : "no"}`,
    `  docs              ${definition.documentationUrl}`,
  ];

  return lines.join("\n");
}

function formatRefs(refs: IntegrationRef[] | undefined): string {
  if (refs === undefined || refs.length === 0) {
    return "none";
  }

  return refs.map(formatRef).join(", ");
}

function formatRef(ref: IntegrationRef): string {
  return ref.type === "integration" ? ref.id : `category:${ref.category}`;
}
