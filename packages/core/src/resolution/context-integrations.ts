import type { RepoSetupConfig } from "../config/types.js";
import type { RegistryLookup } from "./registry-lookup.js";
import type { SelectedIntegration } from "./normalize.js";

export function includeRegisteredContextIntegrations(
  config: RepoSetupConfig,
  selected: readonly SelectedIntegration[],
  registry: RegistryLookup,
): SelectedIntegration[] {
  const seen = new Set(selected.map((item) => item.id));
  const extras: SelectedIntegration[] = [];

  for (const id of [config.runtime.id, config.packageManager]) {
    if (seen.has(id) || registry.get(id) === undefined) {
      continue;
    }

    seen.add(id);
    extras.push({ id });
  }

  return [...extras, ...selected];
}
