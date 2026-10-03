import {
  beginnerCatalogSchema,
  parseSelection,
  planSelectionCreate,
  planInstallationSubset,
  selectionFailure,
  type BeginnerCatalog,
  type DeclarativeSelection,
  type RegistryLookup,
  type SelectionResult,
} from "@reposetup/core";

export function validateSelection(
  value: unknown,
  registry: RegistryLookup,
  catalog: BeginnerCatalog,
): SelectionResult {
  const parsed = parseSelection(value);
  if (!parsed.ok) return parsed;
  const selection = parsed.selection;
  if (
    selection.catalogRevision !== catalog.revision ||
    selection.cliContract !== catalog.cliContract
  ) {
    return selectionFailure(
      "Selection catalog/CLI contract is stale or unsupported. Export it again for this CLI.",
      "catalog",
    );
  }
  const config = selectionConfig(selection);
  const context = catalog.contexts.find(
    (item) =>
      item.context.runtimeId === config.runtime.id &&
      item.context.frameworkId === config.framework.id &&
      item.context.packageManager === config.packageManager &&
      item.context.typescript === config.framework.options?.typescript,
  );
  if (context === undefined)
    return selectionFailure(
      "Selection context is outside the bounded beginner catalog.",
      "context",
    );
  for (const item of [config.framework, ...config.integrations]) {
    const definition = registry.get(item.id);
    if (definition === undefined)
      return selectionFailure("Selection contains an unknown integration.", "integration");
    if (
      item !== config.framework &&
      (!context.optionalIds.includes(item.id) ||
        (selection.mode === "add" && definition.addable !== true))
    ) {
      return selectionFailure(
        "Selection contains an integration outside this context's supported choices.",
        "integration",
      );
    }
    // No schema means no options, rather than an arbitrary object passed to a recipe.
    const options = item.options ?? {};
    if (
      definition.optionSchema === undefined
        ? Object.keys(options).length !== 0
        : !definition.optionSchema.safeParse(options).success
    ) {
      return selectionFailure(
        "Selection contains unknown or invalid integration options.",
        "options",
      );
    }
  }
  const planned =
    selection.mode === "create"
      ? planSelectionCreate(config, registry)
      : planInstallationSubset(
          config,
          registry,
          config.integrations.map((item) => item.id),
        );
  if (!planned.valid)
    return {
      ok: false,
      error: planned.errors[0] ?? selectionFailure("Selection plan is invalid.", "plan").error,
    };
  return parsed;
}

function selectionConfig(selection: DeclarativeSelection) {
  if (selection.mode === "create") return selection.config;
  return {
    schemaVersion: 1 as const,
    project: { name: "existing-project", path: "." },
    runtime: { id: selection.context.runtimeId },
    packageManager: selection.context.packageManager,
    framework: {
      id: selection.context.frameworkId,
      ...(selection.context.typescript === undefined
        ? {}
        : { options: { typescript: selection.context.typescript } }),
    },
    integrations: selection.integrations,
  };
}

export function validateBeginnerCatalog(value: unknown, registry: RegistryLookup): BeginnerCatalog {
  const catalog = beginnerCatalogSchema.parse(value);
  for (const items of [catalog.contexts, catalog.guidance, catalog.presets]) {
    if (new Set(items.map((item) => item.id)).size !== items.length)
      throw new Error("Duplicate beginner catalog IDs.");
  }
  const guidanceIds = new Set(catalog.guidance.map((item) => item.id));
  for (const guidance of catalog.guidance) {
    if (
      registry.get(guidance.id) === undefined ||
      new URL(guidance.documentationUrl).protocol !== "https:"
    )
      throw new Error("Invalid guidance reference/link.");
  }
  for (const context of catalog.contexts) {
    if (context.optionalIds.length > 4)
      throw new Error("Beginner contexts must remain bounded to four optional capabilities.");
    if (new Set(context.optionalIds).size !== context.optionalIds.length)
      throw new Error("Duplicate context choices.");
    for (const id of [context.context.frameworkId, ...context.optionalIds]) {
      if (!guidanceIds.has(id) || registry.get(id) === undefined)
        throw new Error("Missing reviewed guidance.");
    }
  }
  for (const preset of catalog.presets) {
    const context = catalog.contexts.find((item) => item.id === preset.contextId);
    if (context === undefined || context.context.frameworkId !== preset.config.framework.id)
      throw new Error("Unknown preset context.");
    for (const id of [
      preset.config.framework.id,
      ...preset.config.integrations.map((item) => item.id),
    ]) {
      if (!preset.reasons[id]) throw new Error("Missing preset reason.");
    }
    const validated = validateSelection(
      {
        selectionVersion: 1,
        catalogRevision: catalog.revision,
        cliContract: catalog.cliContract,
        mode: "create",
        config: preset.config,
      },
      registry,
      catalog,
    );
    if (!validated.ok) throw validated.error;
    for (let mask = 0; mask < 2 ** context.optionalIds.length; mask++) {
      const integrations = context.optionalIds
        .filter((_, index) => mask & (1 << index))
        .map((id) => ({ id }));
      const variant = validateSelection(
        {
          selectionVersion: 1,
          catalogRevision: catalog.revision,
          cliContract: catalog.cliContract,
          mode: "create",
          config: { ...preset.config, integrations },
        },
        registry,
        catalog,
      );
      if (!variant.ok) throw variant.error;
      if (integrations.length > 0) {
        const add = validateSelection(
          {
            selectionVersion: 1,
            catalogRevision: catalog.revision,
            cliContract: catalog.cliContract,
            mode: "add",
            context: context.context,
            integrations,
          },
          registry,
          catalog,
        );
        if (!add.ok) throw add.error;
      }
    }
  }
  return catalog;
}

export function exportBeginnerCatalog(value: unknown, registry: RegistryLookup): string {
  return JSON.stringify(validateBeginnerCatalog(value, registry), null, 2) + "\n";
}
