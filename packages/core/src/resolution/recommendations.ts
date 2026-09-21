import type { IntegrationDefinition } from "../integrations/definition.js";
import type { IntegrationRef } from "../relationships/models.js";
import type { SelectedIntegration } from "./normalize.js";
import { categoriesOf, isSatisfied } from "./requirements.js";
import type { ResolutionWarning } from "./types.js";

export function collectRecommendations(
  selected: readonly SelectedIntegration[],
  definitions: ReadonlyMap<string, IntegrationDefinition>,
): ResolutionWarning[] {
  const selectedIds = new Set(selected.map((item) => item.id));
  const selectedCategories = categoriesOf(selected, definitions);
  const warnings: ResolutionWarning[] = [];

  for (const item of selected) {
    const definition = definitions.get(item.id);
    if (definition === undefined) {
      continue;
    }

    for (const recommendation of definition.recommendations ?? []) {
      if (isSatisfied(recommendation.target, item.id, selectedIds, selectedCategories)) {
        continue;
      }

      const warning: ResolutionWarning = {
        code: "MISSING_RECOMMENDATION",
        message: recommendationMessage(item.id, recommendation.target, recommendation.reason),
        details: recommendationDetails(item.id, recommendation.target),
      };
      warnings.push(warning);
    }
  }

  return warnings;
}

function recommendationMessage(
  integrationId: string,
  target: IntegrationRef,
  reason: string,
): string {
  const needed =
    target.type === "integration"
      ? `integration "${target.id}"`
      : `an integration in category "${target.category}"`;
  return `Integration "${integrationId}" recommends ${needed}: ${reason}`;
}

function recommendationDetails(
  integrationId: string,
  target: IntegrationRef,
): Record<string, unknown> {
  if (target.type === "integration") {
    return {
      integrationId,
      recommendedId: target.id,
      relationship: "recommends",
    };
  }

  return {
    integrationId,
    recommendedCategory: target.category,
    relationship: "recommends",
  };
}
