import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION } from "../config/types.js";
import type { DetectedStack } from "../detection/types.js";
import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import { configFromDetectedStack, exportConfigFromDetectedStack } from "./config-from-detected.js";

function lookup(ids: string[]): RegistryLookup {
  const definitions = ids.map((id) => fakeIntegration({ id }));
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  return {
    get(id) {
      return byId.get(id);
    },
    list() {
      return [...byId.values()];
    },
    byCategory() {
      return [];
    },
  };
}

function item(
  id: string,
  category: DetectedStack["frameworks"][number]["category"],
): DetectedStack["frameworks"][number] {
  return {
    id,
    name: id,
    category,
    confidence: "certain",
    evidence: [],
  };
}

const stack: DetectedStack = {
  projectRoot: "/virtual/example-next-app",
  runtimes: [item("node", "runtime")],
  packageManagers: [item("pnpm", "package-manager")],
  frameworks: [item("nextjs", "framework")],
  language: { id: "typescript", confidence: "certain", evidence: [] },
  integrations: [item("sqlite", "database"), item("zod", "validation")],
  warnings: [],
};

describe("exportConfigFromDetectedStack", () => {
  it("builds a schemaVersion 1 config without absolute paths or add-only fields", () => {
    const config = exportConfigFromDetectedStack({
      stack,
      registry: lookup(["nextjs", "sqlite", "zod"]),
      runtimeId: "node",
      packageManager: "pnpm",
      frameworkId: "nextjs",
      projectName: "example-next-app",
      typescript: true,
    });

    expect(config).toEqual({
      schemaVersion: SCHEMA_VERSION,
      project: { name: "example-next-app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "nextjs", options: { typescript: true } },
      integrations: [{ id: "sqlite" }, { id: "zod" }],
    });
    expect("path" in config.project).toBe(false);
  });
});

describe("configFromDetectedStack", () => {
  it("keeps add planning rooted at the current project", () => {
    const config = configFromDetectedStack({
      stack,
      registry: lookup(["nextjs", "sqlite", "zod"]),
      runtimeId: "node",
      packageManager: "pnpm",
      frameworkId: "nextjs",
      requestedId: "zod",
      projectName: "example-next-app",
      typescript: true,
    });

    expect(config.project.path).toBe(".");
    expect(config.integrations.map((integration) => integration.id)).toEqual(["sqlite", "zod"]);
  });
});
