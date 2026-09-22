import type { IntegrationDefinition } from "@reposetup/core";

export function definitionMatchesQuery(definition: IntegrationDefinition, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return false;
  }

  const haystacks = [
    definition.id,
    definition.name,
    definition.category,
    definition.description,
    ...(definition.keywords ?? []),
  ];

  return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
}
