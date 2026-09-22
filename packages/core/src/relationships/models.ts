import type { IntegrationCategory } from "../categories/integration-category.js";

export type IntegrationRef =
  { type: "integration"; id: string } | { type: "category"; category: IntegrationCategory };

export interface IntegrationRequirement {
  kind: "requires";
  target: IntegrationRef;
  reason: string;
}

export interface IntegrationRecommendation {
  kind: "recommends";
  target: IntegrationRef;
  reason: string;
}

export interface IntegrationConflict {
  kind: "conflicts";
  target: IntegrationRef;
  reason: string;
}

export interface IntegrationIncludes {
  kind: "includes";
  target: IntegrationRef;
  reason: string;
}

export interface IntegrationAlternative {
  kind: "alternative";
  target: IntegrationRef;
  reason: string;
}

export type IntegrationRelationship =
  | IntegrationRequirement
  | IntegrationRecommendation
  | IntegrationConflict
  | IntegrationIncludes
  | IntegrationAlternative;
