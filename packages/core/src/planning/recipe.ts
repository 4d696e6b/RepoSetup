import { createHash } from "node:crypto";

import * as z from "zod";

import { parseRepoSetupConfig } from "../config/parse.js";
import { repoSetupConfigSchema } from "../config/schema.js";
import type { PackageManager, RepoSetupConfig } from "../config/types.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { InstallationOperation } from "../operations/types.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import type { ResolutionResult } from "../resolution/types.js";

import { planInstallation } from "./plan.js";

export const RECIPE_RECORD_VERSION = 1 as const;

const RECIPE_LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "bun.lock", "uv.lock"] as const;

export type RecipeLockfile = (typeof RECIPE_LOCKFILES)[number];

const declarativeSpecSchema = z
  .string()
  .min(1)
  .refine((spec) => spec.trim() === spec && !/[;&|`$\\\n\r]/.test(spec) && !spec.startsWith("-"), {
    message: "Package specs must be declarative names or versions, not commands.",
  });

/** Declarative reproduction input. It deliberately cannot encode commands or secrets. */
export const recipeRecordSchema = z.strictObject({
  recipeVersion: z.literal(RECIPE_RECORD_VERSION),
  registryRevision: z.string().min(1),
  config: repoSetupConfigSchema,
  lockfiles: z.array(z.enum(RECIPE_LOCKFILES)).max(1),
  directVersions: z.record(z.string().min(1), z.array(declarativeSpecSchema)).optional(),
  planHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});

export interface RecipeRecord {
  recipeVersion: typeof RECIPE_RECORD_VERSION;
  registryRevision: string;
  config: RepoSetupConfig;
  lockfiles: RecipeLockfile[];
  directVersions?: Record<string, string[]>;
  planHash?: string;
}

export interface ReproductionRequirements {
  configAloneIsSufficient: false;
  lockfiles: readonly string[];
  nativePackagesDifferByPlatform: true;
  summary: string;
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
  return {
    success: true,
    record: {
      recipeVersion: parsed.data.recipeVersion,
      registryRevision: parsed.data.registryRevision,
      config: config.config,
      lockfiles: parsed.data.lockfiles,
      ...(parsed.data.directVersions === undefined
        ? {}
        : { directVersions: parsed.data.directVersions }),
      ...(parsed.data.planHash === undefined ? {} : { planHash: parsed.data.planHash }),
    },
  };
}

export function lockfileForPackageManager(
  packageManager: PackageManager,
): RecipeLockfile | undefined {
  switch (packageManager) {
    case "npm":
      return "package-lock.json";
    case "pnpm":
      return "pnpm-lock.yaml";
    case "bun":
      return "bun.lock";
    case "uv":
      return "uv.lock";
    case "pip":
      return undefined;
    default: {
      const exhaustive: never = packageManager;
      return exhaustive;
    }
  }
}

export function reproductionRequirements(record: RecipeRecord): ReproductionRequirements {
  if (record.lockfiles.length === 0) {
    return {
      configAloneIsSufficient: false,
      lockfiles: [],
      nativePackagesDifferByPlatform: true,
      summary:
        "This package manager does not record a lockfile. The recipe record pins direct versions only, so a later install can still resolve different transitive dependencies. Native packages can also differ by operating system and CPU.",
    };
  }

  return {
    configAloneIsSufficient: false,
    lockfiles: record.lockfiles,
    nativePackagesDifferByPlatform: true,
    summary: `Reproducing this install requires this recipe record and ${record.lockfiles.join(", ")}. The config alone does not freeze transitive dependencies. Native packages such as better-sqlite3 and Prisma engines are not byte-identical across operating systems or CPU architectures.`,
  };
}

export function createRecipeRecord(input: {
  config: RepoSetupConfig;
  registry: RegistryLookup;
  registryRevision: string;
  directVersions?: Record<string, readonly string[]>;
}): { ok: true; record: RecipeRecord } | { ok: false; error: RepoSetupError } {
  const planned = planInstallation(input.config, input.registry);
  if (!planned.valid) {
    return { ok: false, error: planned.errors[0] ?? invalidPlanError() };
  }

  const lockfile = lockfileForPackageManager(input.config.packageManager);
  const directVersions = normalizeDirectVersions(input.directVersions);
  const record: RecipeRecord = {
    recipeVersion: RECIPE_RECORD_VERSION,
    registryRevision: input.registryRevision,
    config: input.config,
    lockfiles: lockfile === undefined ? [] : [lockfile],
    ...(directVersions === undefined ? {} : { directVersions }),
    planHash: recipeContentHash({
      registryRevision: input.registryRevision,
      config: input.config,
      lockfiles: lockfile === undefined ? [] : [lockfile],
      directVersions,
      operations: planned.operations,
    }),
  };
  const parsed = parseRecipeRecord(record);
  if (!parsed.success) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true, record: parsed.record };
}

export function planRecipeRecord(record: RecipeRecord, registry: RegistryLookup): ResolutionResult {
  const planned = planInstallation(record.config, registry);
  if (!planned.valid || record.planHash === undefined) {
    return planned;
  }

  const actual = recipeContentHash({
    registryRevision: record.registryRevision,
    config: record.config,
    lockfiles: record.lockfiles,
    directVersions: record.directVersions,
    operations: planned.operations,
  });
  if (actual === record.planHash) {
    return planned;
  }

  return {
    valid: false,
    config: record.config,
    orderedIntegrations: [],
    warnings: [],
    errors: [
      createRepoSetupError({
        code: "RECIPE_INVALID",
        message: "Recipe record does not match the plan reconstructed from the built-in registry.",
        details: { planHash: record.planHash },
        suggestion:
          "Keep the recipe record with its lockfile, and do not edit versions or add commands by hand.",
      }),
    ],
    operations: [],
  };
}

export function recipeContentHash(input: {
  registryRevision: string;
  config: RepoSetupConfig;
  lockfiles: readonly string[];
  directVersions: Record<string, readonly string[]> | undefined;
  operations: readonly InstallationOperation[];
}): string {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

function normalizeDirectVersions(
  directVersions: Record<string, readonly string[]> | undefined,
): Record<string, string[]> | undefined {
  if (directVersions === undefined) {
    return undefined;
  }

  return Object.fromEntries(Object.entries(directVersions).map(([id, specs]) => [id, [...specs]]));
}

function invalidPlanError(): RepoSetupError {
  return createRepoSetupError({
    code: "PLAN_INVALID",
    message: "Recipe config did not produce a plan.",
    suggestion: "Fix the config and registry selection before recording a recipe.",
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter((entry) => entry[1] !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
