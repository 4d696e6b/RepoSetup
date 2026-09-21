import {
  SCHEMA_VERSION,
  type IntegrationSelection,
  type RepoSetupConfig,
} from "../config/types.js";

export interface SelectedIntegration {
  id: string;
  options?: Record<string, unknown>;
}

export interface NormalizedResolutionInput {
  config: RepoSetupConfig;
  selected: SelectedIntegration[];
}

export function normalizeConfig(config: RepoSetupConfig): NormalizedResolutionInput {
  const selected: SelectedIntegration[] = [
    selectionFrom(config.framework.id, config.framework.options),
  ];
  const seen = new Set<string>([config.framework.id]);
  const integrations: IntegrationSelection[] = [];

  for (const integration of config.integrations) {
    if (seen.has(integration.id)) {
      continue;
    }

    seen.add(integration.id);
    const next = selectionFrom(integration.id, integration.options);
    selected.push(next);
    integrations.push(next);
  }

  return {
    config: {
      schemaVersion: SCHEMA_VERSION,
      project: config.project,
      runtime: config.runtime,
      packageManager: config.packageManager,
      framework: config.framework,
      integrations,
    },
    selected,
  };
}

function selectionFrom(id: string, options?: Record<string, unknown>): SelectedIntegration {
  const selection: SelectedIntegration = { id };
  if (options !== undefined) {
    selection.options = options;
  }
  return selection;
}
