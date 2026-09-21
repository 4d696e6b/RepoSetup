import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { IntegrationDefinition } from "../integrations/definition.js";
import type { IntegrationRef } from "../relationships/models.js";
import type { SelectedIntegration } from "./normalize.js";
import { categoriesOf } from "./requirements.js";

export function collectConflicts(
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

    for (const conflict of definition.conflicts ?? []) {
      const match = conflictingSelection(conflict.target, item.id, selectedIds, selectedCategories);
      if (match === undefined) {
        continue;
      }

      errors.push(
        createRepoSetupError({
          code: "INTEGRATION_CONFLICT",
          message: `Integration "${item.id}" conflicts with ${match.label}: ${conflict.reason}`,
          details: match.details,
          suggestion: "Remove one of the conflicting integrations.",
        }),
      );
    }
  }

  return errors;
}

function conflictingSelection(
  target: IntegrationRef,
  sourceId: string,
  selectedIds: ReadonlySet<string>,
  selectedCategories: ReadonlyMap<string, string>,
): { label: string; details: Record<string, unknown> } | undefined {
  if (target.type === "integration") {
    if (target.id === sourceId || !selectedIds.has(target.id)) {
      return undefined;
    }

    return {
      label: `integration "${target.id}"`,
      details: {
        integrationId: sourceId,
        conflictedId: target.id,
        relationship: "conflicts",
      },
    };
  }

  for (const [id, category] of selectedCategories) {
    if (id === sourceId || category !== target.category) {
      continue;
    }

    return {
      label: `integration "${id}" in category "${target.category}"`,
      details: {
        integrationId: sourceId,
        conflictedId: id,
        conflictedCategory: target.category,
        relationship: "conflicts",
      },
    };
  }

  return undefined;
}
