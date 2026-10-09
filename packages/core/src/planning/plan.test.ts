import * as z from "zod";
import { describe, expect, it } from "vitest";

import type { IntegrationDefinition } from "../integrations/definition.js";
import type { RepoSetupConfig } from "../config/types.js";
import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import { planInstallation, toInstallationPlan } from "./plan.js";
import { validateInstallationPlan } from "./validate-plan.js";

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
  } = {},
): RepoSetupConfig {
  return {
    schemaVersion: 1,
    project: { name: "demo" },
    runtime: { id: "node" },
    packageManager: "pnpm",
    framework: overrides.framework ?? { id: "fake-framework" },
    integrations: overrides.integrations ?? [],
  };
}

const framework = fakeIntegration({
  id: "fake-framework",
  category: "framework",
  plan: () => [
    {
      type: "create_directory",
      path: "src",
      behavior: "create_if_missing",
      description: "Create src",
    },
  ],
});

const database = fakeIntegration({
  id: "fake-db",
  category: "database",
  optionSchema: z.object({
    engine: z.literal("sqlite"),
  }),
  plan: (context) => [
    {
      type: "create_file",
      path: "db.txt",
      content: `engine=${String((context.options as { engine: string }).engine)}`,
      behavior: "fail_if_exists",
      description: "Record database engine",
    },
  ],
});

const orm = fakeIntegration({
  id: "fake-orm",
  category: "orm",
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "fake-db" },
      reason: "Needs a database",
    },
  ],
  plan: (context) => [
    {
      type: "install_package",
      packageManager: context.config.packageManager,
      packages: ["fake-orm"],
      cwd: ".",
      description: "Install fake ORM",
      requiresNetwork: true,
    },
    {
      type: "run_command",
      command: "pnpm",
      args: ["exec", "fake-orm", "init"],
      cwd: ".",
      description: "Initialize fake ORM",
    },
  ],
});

describe("planInstallation", () => {
  it("scopes generated files to a named project without moving scaffold commands", () => {
    const childFramework = fakeIntegration({
      id: "fake-framework",
      category: "framework",
      plan: (context) => [
        {
          type: "run_command",
          command: "generator",
          args: [context.projectRoot],
          cwd: ".",
          description: "Scaffold the child app",
        },
        {
          type: "modify_text",
          path: "app/layout.tsx",
          oldText: "old",
          newText: "new",
          description: "Edit the generated layout",
        },
        {
          type: "create_file",
          path: "README.md",
          content: "run instructions",
          behavior: "fail_if_exists",
          description: "Write run instructions",
        },
        {
          type: "install_package",
          packageManager: "pnpm",
          packages: ["example"],
          cwd: context.projectRoot,
          description: "Install in the child app",
        },
      ],
    });
    const input = config();
    input.project.path = "apps/demo";
    const result = planInstallation(input, lookup([childFramework]));

    expect(result.valid).toBe(true);
    expect(result.operations).toEqual([
      expect.objectContaining({ type: "create_directory", path: "apps/demo" }),
      expect.objectContaining({ type: "run_command", args: ["apps/demo"], cwd: "." }),
      expect.objectContaining({ type: "modify_text", path: "apps/demo/app/layout.tsx" }),
      expect.objectContaining({ type: "create_file", path: "apps/demo/README.md" }),
      expect.objectContaining({ type: "install_package", cwd: "apps/demo" }),
      expect.objectContaining({ type: "verify", cwd: "apps/demo" }),
    ]);
  });

  it("rejects unsafe integration paths before scoping them to a child project", () => {
    const bad = fakeIntegration({
      id: "fake-framework",
      category: "framework",
      plan: () => [
        {
          type: "create_file",
          path: "../parent.txt",
          content: "unsafe",
          behavior: "fail_if_exists",
          description: "Invalid parent write",
        },
      ],
    });
    const input = config();
    input.project.path = "apps/demo";
    const result = planInstallation(input, lookup([bad]));

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors[0]?.code).toBe("PLAN_INVALID");
  });

  it("emits a stable operation sequence for the same config and registry", () => {
    const registry = lookup([framework, database, orm]);
    const input = config({
      integrations: [{ id: "fake-orm" }, { id: "fake-db", options: { engine: "sqlite" } }],
    });

    const first = planInstallation(input, registry);
    const second = planInstallation(input, registry);

    expect(first.valid).toBe(true);
    expect(first.operations.map((operation) => operation.type)).toEqual([
      "create_file",
      "create_directory",
      "install_package",
      "run_command",
      "verify",
    ]);
    expect(second).toEqual(first);
    expect(toInstallationPlan(first)).toEqual({
      config: first.config,
      operations: first.operations,
    });
  });

  it("does not plan when resolution fails", () => {
    const result = planInstallation(
      config({ integrations: [{ id: "fake-orm" }] }),
      lookup([framework, orm, database]),
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe("MISSING_REQUIREMENT");
    expect(result.operations).toEqual([]);
    expect(toInstallationPlan(result)).toBeUndefined();
  });

  it("rejects an integration that emits an untyped operation", () => {
    const bad = fakeIntegration({
      id: "fake-framework",
      category: "framework",
      plan: () => [
        {
          type: "run_command",
          command: "pnpm",
          args: "add evil",
          cwd: ".",
          description: "Unsafe shell string",
        } as never,
      ],
    });

    const result = planInstallation(config(), lookup([bad]));

    expect(result.valid).toBe(false);
    expect(result.operations).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "PLAN_INVALID",
      }),
    ]);
  });

  it("rejects invalid integration options before planning", () => {
    const result = planInstallation(
      config({
        integrations: [{ id: "fake-db", options: { engine: "postgres" } }],
      }),
      lookup([framework, database]),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "CONFIG_INVALID",
        details: expect.objectContaining({ integrationId: "fake-db" }),
      }),
    ]);
  });
});

describe("validateInstallationPlan", () => {
  it("accepts typed operations and rejects path traversal", () => {
    const valid = validateInstallationPlan([
      {
        type: "show_message",
        message: "Done",
        description: "Show completion",
      },
    ]);
    expect(valid.valid).toBe(true);
    expect(valid.operations).toHaveLength(1);

    const invalid = validateInstallationPlan([
      {
        type: "create_file",
        path: "../secret",
        content: "no",
        behavior: "fail_if_exists",
        description: "Escape the project",
      },
    ]);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors[0]?.code).toBe("PLAN_INVALID");
  });
});
