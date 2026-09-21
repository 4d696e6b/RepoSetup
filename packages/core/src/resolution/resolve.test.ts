import { describe, expect, it } from "vitest";

import type { IntegrationDefinition } from "../integrations/definition.js";
import type { RepoSetupConfig } from "../config/types.js";
import { fakeIntegration } from "./fake-integration.js";
import { normalizeConfig } from "./normalize.js";
import type { RegistryLookup } from "./registry-lookup.js";
import { resolveConfig } from "./resolve.js";

function lookup(definitions: IntegrationDefinition[]): RegistryLookup {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  return {
    get(id) {
      return byId.get(id);
    },
    list() {
      return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
    },
    byCategory(category) {
      return [...byId.values()].filter((definition) => definition.category === category);
    },
  };
}

function config(
  overrides: {
    framework?: RepoSetupConfig["framework"];
    integrations?: RepoSetupConfig["integrations"];
    runtime?: RepoSetupConfig["runtime"];
    packageManager?: RepoSetupConfig["packageManager"];
  } = {},
): RepoSetupConfig {
  const resolved: RepoSetupConfig = {
    schemaVersion: 1,
    project: { name: "demo" },
    runtime: overrides.runtime ?? { id: "node" },
    packageManager: overrides.packageManager ?? "pnpm",
    framework: overrides.framework ?? { id: "fake-framework" },
    integrations: overrides.integrations ?? [],
  };
  return resolved;
}

const framework = fakeIntegration({
  id: "fake-framework",
  category: "framework",
});

const database = fakeIntegration({
  id: "fake-db",
  category: "database",
});

const orm = fakeIntegration({
  id: "fake-orm",
  category: "orm",
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "database" },
      reason: "Needs a database",
    },
  ],
  recommendations: [
    {
      kind: "recommends",
      target: { type: "integration", id: "fake-lint" },
      reason: "Useful but optional",
    },
  ],
  conflicts: [
    {
      kind: "conflicts",
      target: { type: "integration", id: "fake-other-orm" },
      reason: "Only one ORM is supported",
    },
  ],
});

const otherOrm = fakeIntegration({
  id: "fake-other-orm",
  category: "orm",
});

const linter = fakeIntegration({
  id: "fake-lint",
  category: "linting",
});

describe("resolveConfig", () => {
  it("fails when a requirement is missing", () => {
    const result = resolveConfig(
      config({ integrations: [{ id: "fake-orm" }] }),
      lookup([framework, orm, database]),
    );

    expect(result.valid).toBe(false);
    expect(result.orderedIntegrations).toEqual([]);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "MISSING_REQUIREMENT",
        details: expect.objectContaining({
          integrationId: "fake-orm",
          requiredCategory: "database",
        }),
      }),
    ]);
  });

  it("fails when selected integrations conflict", () => {
    const result = resolveConfig(
      config({
        integrations: [{ id: "fake-db" }, { id: "fake-orm" }, { id: "fake-other-orm" }],
      }),
      lookup([framework, database, orm, otherOrm]),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "INTEGRATION_CONFLICT",
        details: expect.objectContaining({
          integrationId: "fake-orm",
          conflictedId: "fake-other-orm",
        }),
      }),
    ]);
  });

  it("does not treat recommendations as requirements", () => {
    const result = resolveConfig(
      config({ integrations: [{ id: "fake-db" }, { id: "fake-orm" }] }),
      lookup([framework, database, orm, linter]),
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "MISSING_RECOMMENDATION",
        details: expect.objectContaining({
          integrationId: "fake-orm",
          recommendedId: "fake-lint",
        }),
      }),
    ]);
    expect(result.orderedIntegrations.map((item) => item.id)).toEqual([
      "fake-db",
      "fake-framework",
      "fake-orm",
    ]);
  });

  it("produces a stable topological order for a valid graph", () => {
    const registry = lookup([framework, database, orm, linter]);
    const input = config({
      integrations: [{ id: "fake-orm" }, { id: "fake-db" }, { id: "fake-lint" }],
    });

    const first = resolveConfig(input, registry);
    const second = resolveConfig(input, registry);

    expect(first.valid).toBe(true);
    expect(first.orderedIntegrations.map((item) => item.id)).toEqual([
      "fake-db",
      "fake-framework",
      "fake-lint",
      "fake-orm",
    ]);
    expect(second).toEqual(first);
    expect(first.operations).toEqual([]);
  });

  it("fails when selected integrations form a requirement cycle", () => {
    const alpha = fakeIntegration({
      id: "alpha",
      category: "framework",
      requirements: [
        {
          kind: "requires",
          target: { type: "integration", id: "beta" },
          reason: "Needs beta",
        },
      ],
    });
    const beta = fakeIntegration({
      id: "beta",
      category: "utility",
      requirements: [
        {
          kind: "requires",
          target: { type: "integration", id: "alpha" },
          reason: "Needs alpha",
        },
      ],
    });

    const result = resolveConfig(
      config({
        framework: { id: "alpha" },
        integrations: [{ id: "beta" }],
      }),
      lookup([alpha, beta]),
    );

    expect(result.valid).toBe(false);
    expect(result.orderedIntegrations).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "DEPENDENCY_CYCLE",
      }),
    ]);
  });

  it("fails for an unknown selected integration", () => {
    const result = resolveConfig(
      config({ integrations: [{ id: "missing" }] }),
      lookup([framework]),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "UNKNOWN_INTEGRATION",
        details: { integrationId: "missing" },
      }),
    ]);
  });

  it("fails when an integration does not support the context", () => {
    const pythonOnly = fakeIntegration({
      id: "fake-framework",
      category: "framework",
      supports: (context) =>
        context.runtimeId === "python"
          ? { supported: true }
          : { supported: false, reason: "Python only" },
    });

    const result = resolveConfig(config(), lookup([pythonOnly]));

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "UNSUPPORTED_CONTEXT",
        details: { integrationId: "fake-framework", reason: "Python only" },
      }),
    ]);
  });

  it("drops duplicate integration selections during normalization", () => {
    const normalized = normalizeConfig(
      config({
        integrations: [
          { id: "fake-db", options: { engine: "sqlite" } },
          { id: "fake-db", options: { engine: "postgres" } },
          { id: "fake-framework" },
        ],
      }),
    );

    expect(normalized.selected.map((item) => item.id)).toEqual(["fake-framework", "fake-db"]);
    expect(normalized.selected[1]?.options).toEqual({ engine: "sqlite" });
    expect(normalized.config.integrations).toEqual([
      { id: "fake-db", options: { engine: "sqlite" } },
    ]);
  });
});
