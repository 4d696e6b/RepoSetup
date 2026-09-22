import type { ZodType } from "zod";

import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { PlanContext } from "../integrations/definition.js";
import type { ProjectRelativePath } from "../paths/project-path.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import { resolveConfig } from "../resolution/resolve.js";
import { sortResolutionErrors } from "../resolution/sort.js";
import type {
  InstallationPlan,
  ResolutionResult,
  ResolvedIntegration,
} from "../resolution/types.js";
import { validateInstallationPlan } from "./validate-plan.js";

export function planInstallation(
  config: ResolutionResult["config"],
  registry: RegistryLookup,
): ResolutionResult {
  const resolved = resolveConfig(config, registry);
  if (!resolved.valid) {
    return resolved;
  }

  return planResolvedIds(
    resolved,
    registry,
    resolved.orderedIntegrations.map((item) => item.id),
  );
}

export function planInstallationSubset(
  config: ResolutionResult["config"],
  registry: RegistryLookup,
  ids: readonly string[],
): ResolutionResult {
  const resolved = resolveConfig(config, registry);
  if (!resolved.valid) {
    return resolved;
  }

  return planResolvedIds(resolved, registry, ids);
}

function planResolvedIds(
  resolved: ResolutionResult,
  registry: RegistryLookup,
  ids: readonly string[],
): ResolutionResult {
  const planned: unknown[] = [];
  const errors: RepoSetupError[] = [];
  const projectRoot = projectRootFrom(resolved);
  const selected = new Set(ids);
  const ordered = resolved.orderedIntegrations.filter((item) => selected.has(item.id));

  for (const item of ordered) {
    const generated = planIntegration(item, resolved, registry, projectRoot);
    if (!generated.ok) {
      errors.push(generated.error);
      continue;
    }

    planned.push(...generated.operations);
  }

  if (errors.length > 0) {
    return invalidPlan(resolved, errors);
  }

  const validation = validateInstallationPlan(planned);
  if (!validation.valid) {
    return invalidPlan(resolved, validation.errors);
  }

  return {
    ...resolved,
    orderedIntegrations: ordered,
    operations: validation.operations,
  };
}

export function toInstallationPlan(result: ResolutionResult): InstallationPlan | undefined {
  if (!result.valid) {
    return undefined;
  }

  return {
    config: result.config,
    operations: result.operations,
  };
}

function planIntegration(
  item: ResolvedIntegration,
  resolved: ResolutionResult,
  registry: RegistryLookup,
  projectRoot: ProjectRelativePath,
): { ok: true; operations: unknown[] } | { ok: false; error: RepoSetupError } {
  const definition = registry.get(item.id);
  if (definition === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNKNOWN_INTEGRATION",
        message: `Unknown integration "${item.id}" while planning.`,
        details: { integrationId: item.id },
        suggestion: "Register the integration before planning.",
      }),
    };
  }

  const optionsResult = parseOptions(item, definition.optionSchema);
  if (!optionsResult.ok) {
    return { ok: false, error: optionsResult.error };
  }

  const context: PlanContext = {
    config: resolved.config,
    options: optionsResult.options,
    projectRoot,
  };

  try {
    const operations = definition.plan(context);
    if (!Array.isArray(operations)) {
      return {
        ok: false,
        error: createRepoSetupError({
          code: "PLAN_INVALID",
          message: `Integration "${item.id}" did not return an operation array.`,
          details: { integrationId: item.id },
          suggestion: "Integration plan() must return InstallationOperation[].",
        }),
      };
    }

    return { ok: true, operations };
  } catch {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "PLAN_INVALID",
        message: `Integration "${item.id}" failed while generating operations.`,
        details: { integrationId: item.id },
        suggestion: "Integration plan() must be pure and must not throw.",
      }),
    };
  }
}

function parseOptions(
  item: ResolvedIntegration,
  optionSchema: ZodType<unknown> | undefined,
): { ok: true; options: unknown } | { ok: false; error: RepoSetupError } {
  const rawOptions = item.options ?? {};
  if (optionSchema === undefined) {
    return { ok: true, options: rawOptions };
  }

  const parsed = optionSchema.safeParse(rawOptions);
  if (!parsed.success) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "CONFIG_INVALID",
        message: `Options for integration "${item.id}" are invalid.`,
        details: {
          integrationId: item.id,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        suggestion: "Fix the integration options in the RepoSetup config.",
      }),
    };
  }

  return { ok: true, options: parsed.data };
}

function projectRootFrom(result: ResolutionResult): ProjectRelativePath {
  return result.config.project.path ?? ".";
}

function invalidPlan(resolved: ResolutionResult, errors: RepoSetupError[]): ResolutionResult {
  return {
    ...resolved,
    valid: false,
    orderedIntegrations: [],
    operations: [],
    errors: sortResolutionErrors(errors),
  };
}
