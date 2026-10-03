import {
  planSelectionCreate,
  planInstallationSubset,
  SELECTION_LIMITS,
  type BeginnerCatalog,
  type DeclarativeSelection,
  type RegistryLookup,
} from "@reposetup/core";
import { validateBeginnerCatalog, validateSelection } from "./selection.js";

/** Public, declarative snapshot. Execute support predicates/planners only at build time. */
export function createWebsiteCatalog(value: unknown, registry: RegistryLookup) {
  const catalog = validateBeginnerCatalog(value, registry);
  const integrations = catalog.guidance.map((guidance) => {
    const definition = registry.get(guidance.id)!;
    return {
      ...guidance,
      name: definition.name,
      category: definition.category,
      status: definition.status,
      addable: definition.addable === true,
      removable: definition.removable === true,
      requirements: definition.requirements ?? [],
      conflicts: definition.conflicts ?? [],
      includes: definition.includes ?? [],
      verification: definition.verification ?? null,
    };
  });
  const variants = catalog.presets.flatMap((preset) => {
    const context = catalog.contexts.find((item) => item.id === preset.contextId)!;
    return Array.from({ length: 2 ** context.optionalIds.length }, (_, mask) => {
      const ids = context.optionalIds.filter((_, index) => mask & (1 << index));
      const create: DeclarativeSelection = {
        selectionVersion: 1,
        catalogRevision: catalog.revision,
        cliContract: catalog.cliContract,
        mode: "create",
        config: { ...preset.config, integrations: ids.map((id) => ({ id })) },
      };
      const add: DeclarativeSelection | null =
        ids.length === 0
          ? null
          : {
              selectionVersion: 1,
              catalogRevision: catalog.revision,
              cliContract: catalog.cliContract,
              mode: "add",
              context: context.context,
              integrations: ids.map((id) => ({ id })),
            };
      for (const selection of [create, add]) {
        if (selection === null) continue;
        const checked = validateSelection(selection, registry, catalog);
        if (!checked.ok) throw checked.error;
      }
      const createPlan = planSelectionCreate(create.config, registry);
      const addPlan =
        ids.length === 0 ? null : planInstallationSubset(create.config, registry, ids);
      return {
        contextId: context.id,
        ids,
        create,
        add,
        // Descriptions explain impact without shipping commands, source content or operation lists.
        createImpact: createPlan.operations.map((operation) => operation.description),
        addImpact: addPlan?.operations.map((operation) => operation.description) ?? [],
      };
    });
  });
  return { ...catalog, limits: SELECTION_LIMITS, integrations, variants };
}
export type WebsiteCatalog = ReturnType<typeof createWebsiteCatalog>;
export type WebsiteVariant = WebsiteCatalog["variants"][number];
export type WebsiteGuidance = WebsiteCatalog["integrations"][number];
export type WebsitePreset = BeginnerCatalog["presets"][number];
