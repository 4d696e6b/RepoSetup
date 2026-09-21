import type { IntegrationDefinition, IntegrationRelationship } from "@reposetup/core";

export function collectRelationships(definition: IntegrationDefinition): IntegrationRelationship[] {
  return [
    ...(definition.requirements ?? []),
    ...(definition.recommendations ?? []),
    ...(definition.conflicts ?? []),
    ...(definition.includes ?? []),
    ...(definition.alternatives ?? []),
  ];
}
