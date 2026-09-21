import {
  createRepoSetupError,
  type IntegrationCategory,
  type IntegrationDefinition,
} from "@reposetup/core";

import { definitionMatchesQuery } from "./search.js";
import { sortDefinitions } from "./sort.js";
import { validateRegistry, type RegistryValidationResult } from "./validate.js";

export interface IntegrationRegistry {
  register(definition: IntegrationDefinition): void;
  get(id: string): IntegrationDefinition | undefined;
  list(): IntegrationDefinition[];
  search(query: string): IntegrationDefinition[];
  byCategory(category: IntegrationCategory): IntegrationDefinition[];
  validate(): RegistryValidationResult;
}

export function createRegistry(
  definitions: readonly IntegrationDefinition[] = [],
): IntegrationRegistry {
  const byId = new Map<string, IntegrationDefinition>();

  const registry: IntegrationRegistry = {
    register(definition: IntegrationDefinition): void {
      if (byId.has(definition.id)) {
        throw createRepoSetupError({
          code: "DUPLICATE_INTEGRATION",
          message: `Integration id "${definition.id}" is already registered.`,
          details: { integrationId: definition.id },
          suggestion: "Give each integration a unique id.",
        });
      }

      byId.set(definition.id, definition);
    },

    get(id: string): IntegrationDefinition | undefined {
      return byId.get(id);
    },

    list(): IntegrationDefinition[] {
      return sortDefinitions([...byId.values()]);
    },

    search(query: string): IntegrationDefinition[] {
      return registry.list().filter((definition) => definitionMatchesQuery(definition, query));
    },

    byCategory(category: IntegrationCategory): IntegrationDefinition[] {
      return registry.list().filter((definition) => definition.category === category);
    },

    validate(): RegistryValidationResult {
      return validateRegistry(registry.list());
    },
  };

  for (const definition of definitions) {
    registry.register(definition);
  }

  return registry;
}
