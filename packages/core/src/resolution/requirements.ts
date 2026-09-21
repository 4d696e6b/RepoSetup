import type { IntegrationCategory } from "../categories/integration-category.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { IntegrationDefinition } from "../integrations/definition.js";
import type { IntegrationRef } from "../relationships/models.js";
import type { SelectedIntegration } from "./normalize.js";

export function collectUnknownIntegrations(
  selected: readonly SelectedIntegration[],
  definitions: ReadonlyMap<string, IntegrationDefinition>,
): RepoSetupError[] {
  const errors: RepoSetupError[] = [];

  for (const item of selected) {
    if (definitions.has(item.id)) {
      continue;
    }

    errors.push(
      createRepoSetupError({
        code: "UNKNOWN_INTEGRATION",
        message: `Unknown integration "${item.id}".`,
        details: { integrationId: item.id },
        suggestion: "Choose an integration from the built-in registry.",
      }),
    );
  }

  return errors;
}

export function collectMissingRequirements(
  selected: readonly SelectedIntegration[],
  definitions: ReadonlyMap<string, IntegrationDefinition>,
): RepoSetupError[] {
  const selectedIds = new Set(selected.map((item) => item.id));
  const selectedCategories = categoriesOf(selected, definitions);
  const errors: RepoSetupError[] = [];

  for (const item of selected) {
    const definition = definitions.get(item.id);
    if (definition === undefined) {
      continue;
    }

    for (const requirement of definition.requirements ?? []) {
      if (isSatisfied(requirement.target, item.id, selectedIds, selectedCategories)) {
        continue;
      }

      errors.push(
        createRepoSetupError({
          code: "MISSING_REQUIREMENT",
          message: missingRequirementMessage(item.id, requirement.target, requirement.reason),
          details: requirementDetails(item.id, requirement.target),
          suggestion: "Add the required integration or choose a compatible alternative.",
        }),
      );
    }
  }

  return errors;
}

export function isSatisfied(
  target: IntegrationRef,
  sourceId: string,
  selectedIds: ReadonlySet<string>,
  selectedCategories: ReadonlyMap<string, string>,
): boolean {
  if (target.type === "integration") {
    return selectedIds.has(target.id);
  }

  for (const [id, category] of selectedCategories) {
    if (id !== sourceId && categorySatisfiesRequirement(target.category, category)) {
      return true;
    }
  }

  return false;
}

export function categoriesOf(
  selected: readonly SelectedIntegration[],
  definitions: ReadonlyMap<string, IntegrationDefinition>,
): Map<string, string> {
  const categories = new Map<string, string>();

  for (const item of selected) {
    const definition = definitions.get(item.id);
    if (definition !== undefined) {
      categories.set(item.id, definition.category);
    }
  }

  return categories;
}

export function categorySatisfiesRequirement(
  required: IntegrationCategory | string,
  actual: string,
): boolean {
  if (required === actual) {
    return true;
  }

  // backend-framework is the application scaffold for APIs. Integrations that
  // attach to "a framework" should also resolve against Express/Fastify.
  return required === "framework" && actual === "backend-framework";
}

function missingRequirementMessage(
  integrationId: string,
  target: IntegrationRef,
  reason: string,
): string {
  const needed =
    target.type === "integration"
      ? `integration "${target.id}"`
      : `an integration in category "${target.category}"`;
  return `Integration "${integrationId}" requires ${needed}: ${reason}`;
}

function requirementDetails(
  integrationId: string,
  target: IntegrationRef,
): Record<string, unknown> {
  if (target.type === "integration") {
    return {
      integrationId,
      requiredId: target.id,
      relationship: "requires",
    };
  }

  return {
    integrationId,
    requiredCategory: target.category,
    relationship: "requires",
  };
}
