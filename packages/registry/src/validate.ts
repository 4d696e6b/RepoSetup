import {
  createRepoSetupError,
  INTEGRATION_CATEGORIES,
  type IntegrationDefinition,
  type RepoSetupError,
} from "@reposetup/core";

import { findRequirementCycles } from "./cycles.js";
import { collectRelationships } from "./relationships.js";
import { sortErrors } from "./sort.js";

export interface RegistryValidationResult {
  valid: boolean;
  errors: RepoSetupError[];
}

export function validateRegistry(
  definitions: readonly IntegrationDefinition[],
): RegistryValidationResult {
  const errors: RepoSetupError[] = [];
  const seenIds = new Map<string, IntegrationDefinition>();

  for (const definition of definitions) {
    const existing = seenIds.get(definition.id);
    if (existing !== undefined) {
      errors.push(
        createRepoSetupError({
          code: "DUPLICATE_INTEGRATION",
          message: `Integration id "${definition.id}" is registered more than once.`,
          details: { integrationId: definition.id },
          suggestion: "Give each integration a unique id.",
        }),
      );
      continue;
    }

    seenIds.set(definition.id, definition);
  }

  const uniqueDefinitions = [...seenIds.values()];
  const registeredIds = new Set(seenIds.keys());

  for (const definition of uniqueDefinitions) {
    for (const relationship of collectRelationships(definition)) {
      if (relationship.target.type === "category") {
        if (!INTEGRATION_CATEGORIES.includes(relationship.target.category)) {
          errors.push(
            createRepoSetupError({
              code: "UNKNOWN_INTEGRATION",
              message: `Integration "${definition.id}" references unknown category "${relationship.target.category}".`,
              details: {
                integrationId: definition.id,
                category: relationship.target.category,
                relationship: relationship.kind,
              },
              suggestion: "Use one of the documented integration categories.",
            }),
          );
        }
        continue;
      }

      if (!registeredIds.has(relationship.target.id)) {
        errors.push(
          createRepoSetupError({
            code: "UNKNOWN_INTEGRATION",
            message: `Integration "${definition.id}" references unknown integration "${relationship.target.id}".`,
            details: {
              integrationId: definition.id,
              referencedId: relationship.target.id,
              relationship: relationship.kind,
            },
            suggestion: "Register the referenced integration or remove the relationship.",
          }),
        );
      }
    }
  }

  for (const cycle of findRequirementCycles(uniqueDefinitions)) {
    errors.push(
      createRepoSetupError({
        code: "DEPENDENCY_CYCLE",
        message: `Requirement cycle detected: ${cycle.join(" -> ")}.`,
        details: {
          cycle,
        },
        suggestion: "Remove or redirect a requirement so the graph is acyclic.",
      }),
    );
  }

  const sorted = sortErrors(errors);
  return {
    valid: sorted.length === 0,
    errors: sorted,
  };
}
