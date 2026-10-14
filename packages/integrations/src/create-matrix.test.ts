import { parseRepoSetupConfig, planInstallation, type RepoSetupConfig } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const registry = createBuiltInRegistry();
const frameworks = ["nextjs", "react-vite", "express", "fastify", "fastapi", "flask"];
const destinations = [".", "demo", "apps/demo"];
const nodeSelections = [
  [],
  ["zod"],
  ["prettier"],
  ["eslint"],
  ["vitest"],
  ["playwright"],
  ["sqlite"],
  ["postgresql"],
  ["mongodb"],
  ["mongodb", "mongoose"],
  ["sqlite", "prisma"],
  ["postgresql", "prisma"],
  ["postgresql", "drizzle"],
  ["github-actions"],
];
const pythonSelections = [
  [],
  ["pydantic"],
  ["pytest"],
  ["ruff"],
  ["postgresql"],
  ["postgresql", "sqlalchemy"],
  ["postgresql", "sqlalchemy", "alembic"],
  ["postgresql", "docker", "docker-compose"],
];
const browserSelections = [["tailwind"], ["tailwind", "shadcn"]];

function config(
  id: string,
  manager: RepoSetupConfig["packageManager"],
  destination: string,
  ids: string[],
  typescript = true,
): RepoSetupConfig {
  return {
    schemaVersion: 1,
    project: { name: "demo", path: destination },
    runtime: { id: ["fastapi", "flask"].includes(id) ? "python" : "node" },
    packageManager: manager,
    framework: { id, ...(["fastapi", "flask"].includes(id) ? {} : { options: { typescript } }) },
    integrations: ids.map((id) => ({ id })),
  };
}

const cases = frameworks.flatMap((framework) => {
  const python = ["fastapi", "flask"].includes(framework);
  const managers: RepoSetupConfig["packageManager"][] = python ? ["uv", "pip"] : ["npm", "pnpm"];
  const selections = python
    ? [
        ...pythonSelections,
        ...(framework === "fastapi"
          ? [
              ["httpx", "pytest"],
              ["pydantic-settings", "pydantic", "pytest"],
            ]
          : []),
      ]
    : [
        ...nodeSelections,
        ...(["nextjs", "react-vite"].includes(framework) ? browserSelections : []),
        ...(framework === "react-vite"
          ? [
              ["vitest", "testing-library"],
              ["vitest", "testing-library", "tanstack-query"],
            ]
          : []),
      ];
  return managers.flatMap((manager) =>
    destinations.flatMap((destination) =>
      selections.map((ids) => ({ framework, manager, destination, ids })),
    ),
  );
});

describe("0.2.x create plan stability matrix", () => {
  it.each(cases)(
    "$framework / $manager / $destination / $ids",
    ({ framework, manager, destination, ids }) => {
      const input = config(framework, manager, destination, ids);
      expect(parseRepoSetupConfig(input).success).toBe(true);
      const result = planInstallation(input, registry);
      expect(result.valid, JSON.stringify(result.errors)).toBe(true);
      expect(result.operations.length).toBeGreaterThan(0);
      for (const operation of result.operations) {
        if ("path" in operation && destination !== ".") {
          expect(
            operation.path === destination || operation.path.startsWith(`${destination}/`),
            JSON.stringify(operation),
          ).toBe(true);
        }
        if (operation.type === "install_package") expect(operation.cwd).toBe(destination);
        if (operation.type === "install_package" && ["npm", "pnpm"].includes(manager)) {
          expect(operation.includeDev, JSON.stringify(operation)).toBe(true);
        }
        if (
          operation.type === "run_command" &&
          ["npm", "pnpm"].includes(manager) &&
          operation.command === manager &&
          operation.args[0] === "install"
        ) {
          expect(operation.args).toContain(manager === "npm" ? "--include=dev" : "--prod=false");
        }
        if (
          operation.type === "run_command" &&
          operation.skipsDependencyInstall !== true &&
          !operation.args.includes("--skip-install") &&
          !["create", "init"].includes(operation.args[0] ?? "")
        )
          expect(operation.cwd).toBe(destination);
      }
      expect(planInstallation(input, registry).operations).toEqual(result.operations);
    },
  );

  it("permits the bare Express tsx build before its consolidated pnpm install", () => {
    const result = planInstallation(config("express", "pnpm", "apps/demo", []), registry);
    expect(result.valid).toBe(true);
    const approval = result.operations.findIndex(
      (operation) =>
        operation.type === "create_file" &&
        operation.path === "apps/demo/pnpm-workspace.yaml" &&
        operation.content.includes('"esbuild": true'),
    );
    const install = result.operations.findIndex(
      (operation) =>
        operation.type === "run_command" &&
        operation.command === "pnpm" &&
        operation.args[0] === "install",
    );
    expect(approval).toBeGreaterThanOrEqual(0);
    expect(install).toBeGreaterThan(approval);
  });

  it.each(
    ["nextjs", "react-vite", "express", "fastify"].flatMap((framework) =>
      ["npm", "pnpm"].map((manager) => ({ framework, manager: manager as "npm" | "pnpm" })),
    ),
  )("$framework JavaScript / $manager", ({ framework, manager }) => {
    expect(
      planInstallation(config(framework, manager, "apps/demo", [], false), registry).valid,
    ).toBe(true);
  });

  it.each(frameworks)(
    "rejects a wrong runtime and manager for %s before producing operations",
    (framework) => {
      const python = ["fastapi", "flask"].includes(framework);
      const input = config(framework, python ? "npm" : "uv", "demo", []);
      const result = planInstallation(input, registry);
      expect(result.valid).toBe(false);
      expect(result.operations).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    },
  );
});
