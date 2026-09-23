import * as z from "zod";

import { repoSetupConfigSchema } from "../config/schema.js";
import { parseRepoSetupConfig } from "../config/parse.js";
import type { RepoSetupConfig } from "../config/types.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import type { ResolutionResult } from "../resolution/types.js";
import { planInstallation } from "./plan.js";

export const RECIPE_RECORD_VERSION = 1 as const;

/** Declarative reproduction input. It deliberately cannot encode commands or secrets. */
export const recipeRecordSchema = z.strictObject({
  recipeVersion: z.literal(RECIPE_RECORD_VERSION),
  registryRevision: z.string().min(1),
  config: repoSetupConfigSchema,
  lockfiles: z.array(z.enum(["package-lock.json", "pnpm-lock.yaml", "bun.lock", "uv.lock"])).max(1),
});

export interface RecipeRecord {
  recipeVersion: typeof RECIPE_RECORD_VERSION;
  registryRevision: string;
  config: RepoSetupConfig;
  lockfiles: ("package-lock.json" | "pnpm-lock.yaml" | "bun.lock" | "uv.lock")[];
}

export type RecipeParseResult =
  { success: true; record: RecipeRecord } | { success: false; error: RepoSetupError };

export function parseRecipeRecord(input: unknown): RecipeParseResult {
  const parsed = recipeRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: createRepoSetupError({
        code: "RECIPE_INVALID",
        message: "Recipe record is invalid.",
        details: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        suggestion: "Use a declarative recipeVersion 1 record without commands or credentials.",
      }),
    };
  }
  const config = parseRepoSetupConfig(parsed.data.config);
  if (!config.success) return { success: false, error: config.error };
  return { success: true, record: { ...parsed.data, config: config.config } };
}

export function planRecipeRecord(record: RecipeRecord, registry: RegistryLookup): ResolutionResult {
  return planInstallation(record.config, registry);
}
