import type { RepoSetupConfig } from "../config/types.js";
import type { IntegrationDefinition, SupportContext } from "../integrations/definition.js";
import { collectConflicts } from "./conflicts.js";
import { sortSelectedIntegrations } from "./graph.js";
import { normalizeConfig } from "./normalize.js";
import { collectRecommendations } from "./recommendations.js";
import type { RegistryLookup } from "./registry-lookup.js";
import { collectMissingRequirements, collectUnknownIntegrations } from "./requirements.js";
import { sortResolutionErrors, sortResolutionWarnings } from "./sort.js";
import { collectUnsupportedContexts } from "./support.js";
import type { ResolutionResult, ResolvedIntegration } from "./types.js";

export function resolveConfig(config: RepoSetupConfig, registry: RegistryLookup): ResolutionResult {
  const normalized = normalizeConfig(config);
  const definitions = lookUpDefinitions(normalized.selected, registry);
  const supportContext = supportContextFrom(normalized.config, normalized.selected);

  const errors = [
    ...collectUnknownIntegrations(normalized.selected, definitions),
    ...collectMissingRequirements(normalized.selected, definitions),
    ...collectConflicts(normalized.selected, definitions),
    ...collectUnsupportedContexts(normalized.selected, definitions, supportContext),
  ];

  const warnings = collectRecommendations(normalized.selected, definitions);
  const sortedErrors = sortResolutionErrors(errors);
  const sortedWarnings = sortResolutionWarnings(warnings);

  if (sortedErrors.length > 0) {
    return {
      valid: false,
      config: normalized.config,
      orderedIntegrations: [],
      warnings: sortedWarnings,
      errors: sortedErrors,
      operations: [],
    };
  }

  const sorted = sortSelectedIntegrations(normalized.selected, definitions);
  if (!sorted.ok) {
    return {
      valid: false,
      config: normalized.config,
      orderedIntegrations: [],
      warnings: sortedWarnings,
      errors: [sorted.error],
      operations: [],
    };
  }

  return {
    valid: true,
    config: normalized.config,
    orderedIntegrations: sorted.order.map((id) =>
      toResolvedIntegration(id, definitions.get(id), normalized.selected),
    ),
    warnings: sortedWarnings,
    errors: [],
    operations: [],
  };
}

function lookUpDefinitions(
  selected: readonly { id: string }[],
  registry: RegistryLookup,
): Map<string, IntegrationDefinition> {
  const definitions = new Map<string, IntegrationDefinition>();

  for (const item of selected) {
    const definition = registry.get(item.id);
    if (definition !== undefined) {
      definitions.set(item.id, definition);
    }
  }

  return definitions;
}

function supportContextFrom(
  config: RepoSetupConfig,
  selected: readonly { id: string }[],
): SupportContext {
  return {
    runtimeId: config.runtime.id,
    packageManager: config.packageManager,
    frameworkId: config.framework.id,
    integrationIds: selected.map((item) => item.id),
  };
}

function toResolvedIntegration(
  id: string,
  definition: IntegrationDefinition | undefined,
  selected: readonly { id: string; options?: Record<string, unknown> }[],
): ResolvedIntegration {
  const resolved: ResolvedIntegration = {
    id,
    category: definition?.category ?? "utility",
  };
  const options = selected.find((item) => item.id === id)?.options;
  if (options !== undefined) {
    resolved.options = options;
  }
  return resolved;
}
