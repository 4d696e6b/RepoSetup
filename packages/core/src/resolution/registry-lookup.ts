import type { IntegrationCategory } from "../categories/integration-category.js";
import type { IntegrationDefinition } from "../integrations/definition.js";

export interface RegistryLookup {
  get(id: string): IntegrationDefinition | undefined;
  list(): readonly IntegrationDefinition[];
  byCategory(category: IntegrationCategory): readonly IntegrationDefinition[];
}
