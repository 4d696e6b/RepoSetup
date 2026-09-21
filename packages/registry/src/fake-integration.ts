import type { IntegrationDefinition } from "@reposetup/core";

type FakeOverrides = Partial<IntegrationDefinition> & Pick<IntegrationDefinition, "id">;

export function fakeIntegration(overrides: FakeOverrides): IntegrationDefinition {
  const definition: IntegrationDefinition = {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    category: overrides.category ?? "utility",
    description: overrides.description ?? `Fake integration ${overrides.id}`,
    status: overrides.status ?? "experimental",
    documentationUrl:
      overrides.documentationUrl ?? `https://example.test/integrations/${overrides.id}`,
    supports: overrides.supports ?? (() => ({ supported: true })),
    plan: overrides.plan ?? (() => []),
  };

  if (overrides.keywords !== undefined) {
    definition.keywords = overrides.keywords;
  }
  if (overrides.requirements !== undefined) {
    definition.requirements = overrides.requirements;
  }
  if (overrides.recommendations !== undefined) {
    definition.recommendations = overrides.recommendations;
  }
  if (overrides.conflicts !== undefined) {
    definition.conflicts = overrides.conflicts;
  }
  if (overrides.includes !== undefined) {
    definition.includes = overrides.includes;
  }
  if (overrides.alternatives !== undefined) {
    definition.alternatives = overrides.alternatives;
  }
  if (overrides.optionSchema !== undefined) {
    definition.optionSchema = overrides.optionSchema;
  }
  if (overrides.verification !== undefined) {
    definition.verification = overrides.verification;
  }
  if (overrides.addable !== undefined) {
    definition.addable = overrides.addable;
  }
  if (overrides.removable !== undefined) {
    definition.removable = overrides.removable;
  }
  if (overrides.detect !== undefined) {
    definition.detect = overrides.detect;
  }
  if (overrides.remove !== undefined) {
    definition.remove = overrides.remove;
  }
  if (overrides.verify !== undefined) {
    definition.verify = overrides.verify;
  }

  return definition;
}
