import type { RepoSetupConfig } from "../config/types.js";
import * as z from "zod";
import { repoSetupConfigSchema } from "../config/schema.js";
import { selectionContextSchema } from "./format.js";

export const beginnerCatalogSchema = z.strictObject({
  schemaVersion: z.literal(1),
  revision: z.string().min(1),
  recipeRevision: z.string().min(1),
  directVersions: z.record(z.string(), z.array(z.string().min(1))),
  cliContract: z.literal("selection-v1"),
  contexts: z.array(
    z.strictObject({
      id: z.string().min(1),
      context: selectionContextSchema,
      optionalIds: z.array(z.string().min(1)),
      evidence: z.string().min(1),
      limitations: z.string().min(1),
    }),
  ),
  guidance: z.array(
    z.strictObject({
      id: z.string().min(1),
      purpose: z.string().min(1),
      when: z.string().min(1),
      unnecessary: z.string().min(1),
      example: z.string().min(1),
      prerequisites: z.string().min(1),
      alternatives: z.string().min(1),
      impact: z.string().min(1),
      goals: z.array(z.string().min(1)).min(1),
      documentationUrl: z.url(),
      reviewedAt: z.iso.date(),
    }),
  ),
  presets: z.array(
    z.strictObject({
      id: z.string().min(1),
      name: z.string().min(1),
      outcome: z.string().min(1),
      audience: z.string().min(1),
      contextId: z.string().min(1),
      kind: z.literal("starter"),
      support: z.literal("candidate"),
      config: repoSetupConfigSchema.transform((config) => config as RepoSetupConfig),
      reasons: z.record(z.string(), z.string().min(1)),
    }),
  ),
});
export type BeginnerCatalog = z.infer<typeof beginnerCatalogSchema>;
