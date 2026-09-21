import * as z from "zod";

import { INTEGRATION_CATEGORIES } from "../categories/integration-category.js";

const integrationRefSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("integration"),
    id: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal("category"),
    category: z.enum(INTEGRATION_CATEGORIES),
  }),
]);

const reasonSchema = z.string().min(1);

export const integrationRequirementSchema = z.strictObject({
  kind: z.literal("requires"),
  target: integrationRefSchema,
  reason: reasonSchema,
});

export const integrationRecommendationSchema = z.strictObject({
  kind: z.literal("recommends"),
  target: integrationRefSchema,
  reason: reasonSchema,
});

export const integrationConflictSchema = z.strictObject({
  kind: z.literal("conflicts"),
  target: integrationRefSchema,
  reason: reasonSchema,
});

export const integrationIncludesSchema = z.strictObject({
  kind: z.literal("includes"),
  target: integrationRefSchema,
  reason: reasonSchema,
});

export const integrationAlternativeSchema = z.strictObject({
  kind: z.literal("alternative"),
  target: integrationRefSchema,
  reason: reasonSchema,
});

export const integrationRelationshipSchema = z.discriminatedUnion("kind", [
  integrationRequirementSchema,
  integrationRecommendationSchema,
  integrationConflictSchema,
  integrationIncludesSchema,
  integrationAlternativeSchema,
]);
