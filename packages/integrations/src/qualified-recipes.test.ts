import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createRecipeRecord,
  parseRepoSetupConfig,
  planInstallation,
  serializeRepoSetupConfig,
  type InstallationOperation,
} from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";
import {
  QUALIFIED_PEERS,
  REGISTRY_REVISION,
  qualifiedDirectVersions,
} from "./qualified-versions.js";

const examplesRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../examples");
const recipes = [
  "reposetup.next-sqlite.json",
  "reposetup.react-vite.json",
  "reposetup.express-postgres.json",
  "reposetup.fastapi.json",
  "reposetup.flask.json",
] as const;

describe("qualified recipe records", () => {
  it("keeps schemaVersion 1 examples stable and free of floating generators", () => {
    const registry = createBuiltInRegistry();
    for (const name of recipes) {
      const source = readFileSync(join(examplesRoot, name), "utf8");
      const parsed = parseRepoSetupConfig(JSON.parse(source));
      expect(parsed.success, name).toBe(true);
      if (!parsed.success) {
        continue;
      }
      expect(parsed.config.schemaVersion).toBe(1);
      const again = parseRepoSetupConfig(JSON.parse(serializeRepoSetupConfig(parsed.config)));
      expect(again.success, name).toBe(true);
      if (again.success) {
        expect(again.config).toEqual(parsed.config);
      }

      const planned = planInstallation(parsed.config, registry);
      expect(planned.valid, name).toBe(true);
      const rendered = JSON.stringify(planned.operations);
      expect(rendered, name).not.toContain("@latest");
      expect(rendered, name).not.toContain("@prev");
      expect(protectedPaths(planned.operations), name).toEqual([]);

      const ids = [
        parsed.config.framework.id,
        ...parsed.config.integrations.map((integration) => integration.id),
      ];
      const first = createRecipeRecord({
        config: parsed.config,
        registry,
        registryRevision: REGISTRY_REVISION,
        directVersions: qualifiedDirectVersions(ids),
      });
      const second = createRecipeRecord({
        config: parsed.config,
        registry,
        registryRevision: REGISTRY_REVISION,
        directVersions: qualifiedDirectVersions(ids),
      });
      expect(first.ok && second.ok, name).toBe(true);
      if (first.ok && second.ok) {
        expect(first.record.planHash, name).toBe(second.record.planHash);
        expect(first.record.lockfiles, name).toEqual(
          parsed.config.packageManager === "pnpm" ? ["pnpm-lock.yaml"] : ["uv.lock"],
        );
      }
    }
  });

  it("records peer constraints that the qualified direct versions satisfy", () => {
    const pins = JSON.stringify(
      qualifiedDirectVersions(["react-vite", "vitest", "prisma", "express"]),
    );
    for (const peer of QUALIFIED_PEERS) {
      expect(pins).toContain(peer.satisfiedBy);
    }
  });
});

function protectedPaths(operations: readonly InstallationOperation[]): string[] {
  return operations.flatMap((operation) => {
    if (
      operation.type !== "create_file" &&
      operation.type !== "modify_text" &&
      operation.type !== "modify_json" &&
      operation.type !== "add_env_example"
    ) {
      return [];
    }
    if (operation.path === ".npmrc" || operation.path === ".pnpmrc" || operation.path === ".env") {
      return [operation.path];
    }
    return [];
  });
}
