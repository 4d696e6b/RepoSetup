import type { IntegrationDefinition } from "@reposetup/core";

import { EXIT_CODES } from "./exit-codes.js";
import { writeLine } from "./io.js";
import { isKnownCategory } from "./prompt-create.js";
import type { ResolvedCliDeps } from "./types.js";

export function handleSearch(input: {
  query: string | undefined;
  category: string | undefined;
  deps: ResolvedCliDeps;
}): number {
  const query = input.query?.trim() ?? "";

  if (query.length === 0 && input.category === undefined) {
    writeLine(input.deps.io.writeErr, "Provide a search query or --category.");
    return EXIT_CODES.INVALID_INPUT;
  }

  if (input.category !== undefined && !isKnownCategory(input.category)) {
    writeLine(input.deps.io.writeErr, `Unknown category "${input.category}".`);
    return EXIT_CODES.INVALID_INPUT;
  }

  const matches = collectSearchHits(input.deps, query, input.category);
  if (matches.length === 0) {
    writeLine(input.deps.io.writeOut, "No integrations matched.");
    return EXIT_CODES.SUCCESS;
  }

  writeLine(input.deps.io.writeOut, matches.map(formatSearchHit).join("\n"));
  return EXIT_CODES.SUCCESS;
}

function collectSearchHits(
  deps: ResolvedCliDeps,
  query: string,
  category: string | undefined,
): IntegrationDefinition[] {
  const pool = query.length === 0 ? deps.registry.list() : deps.registry.search(query);

  if (category === undefined) {
    return pool;
  }

  return pool.filter((definition) => definition.category === category);
}

function formatSearchHit(definition: IntegrationDefinition): string {
  return `${definition.id}  ${definition.category}  ${definition.name}`;
}
