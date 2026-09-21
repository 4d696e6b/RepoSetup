import type { IntegrationDefinition } from "@reposetup/core";

type DefinitionInput<TOptions> = IntegrationDefinition<TOptions>;

export function defineIntegration<TOptions = unknown>(
  definition: DefinitionInput<TOptions>,
): IntegrationDefinition<TOptions> {
  const result: IntegrationDefinition<TOptions> = {
    id: definition.id,
    name: definition.name,
    category: definition.category,
    description: definition.description,
    status: definition.status,
    documentationUrl: definition.documentationUrl,
    supports: definition.supports,
    plan: definition.plan,
  };

  if (definition.keywords !== undefined) {
    result.keywords = definition.keywords;
  }
  if (definition.optionSchema !== undefined) {
    result.optionSchema = definition.optionSchema;
  }
  if (definition.requirements !== undefined) {
    result.requirements = definition.requirements;
  }
  if (definition.recommendations !== undefined) {
    result.recommendations = definition.recommendations;
  }
  if (definition.conflicts !== undefined) {
    result.conflicts = definition.conflicts;
  }
  if (definition.includes !== undefined) {
    result.includes = definition.includes;
  }
  if (definition.alternatives !== undefined) {
    result.alternatives = definition.alternatives;
  }
  if (definition.verification !== undefined) {
    result.verification = definition.verification;
  }
  if (definition.addable !== undefined) {
    result.addable = definition.addable;
  }
  if (definition.detect !== undefined) {
    result.detect = definition.detect;
  }
  if (definition.verify !== undefined) {
    result.verify = definition.verify;
  }

  return result;
}

export const VERIFIED_AT = "2026-09-21";
