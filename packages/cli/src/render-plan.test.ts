import { describe, expect, it } from "vitest";
import type { InstallationOperation, ResolutionResult } from "@reposetup/core";

import { renderPlan } from "./render-plan.js";

function result(operations: InstallationOperation[]): ResolutionResult {
  return {
    valid: true,
    config: {
      schemaVersion: 1,
      project: { name: "demo" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "fake-framework" },
      integrations: [],
    },
    orderedIntegrations: [{ id: "fake-framework", category: "framework" }],
    warnings: [],
    errors: [],
    operations,
  };
}

describe("renderPlan", () => {
  it("prints a human-readable dry-run with ordered operations", () => {
    const output = renderPlan(
      result([
        {
          type: "create_directory",
          path: "src",
          behavior: "create_if_missing",
          description: "Create src",
        },
        {
          type: "install_package",
          packageManager: "pnpm",
          packages: ["fake-orm"],
          cwd: ".",
          description: "Install fake ORM",
          exact: true,
          allowBuild: ["esbuild"],
        },
      ]),
      { dryRun: true, verbose: false, quiet: false },
    );

    expect(output).toContain("Dry-run for demo");
    expect(output).toContain("1. create_directory  Create src");
    expect(output).toContain("path  src");
    expect(output).toContain("2. install_package  Install fake ORM");
    expect(output).toContain("packages  fake-orm");
    expect(output).toContain("exact  true");
    expect(output).toContain("allowBuild  esbuild");
    expect(output).toContain("No files or commands were executed.");
  });

  it("prints errors when the plan is invalid", () => {
    const output = renderPlan(
      {
        ...result([]),
        valid: false,
        errors: [
          {
            code: "MISSING_REQUIREMENT",
            message: "fake-orm requires a database.",
          },
        ],
      },
      { dryRun: true, verbose: false, quiet: false },
    );

    expect(output).toContain("Could not plan installation for demo.");
    expect(output).toContain("Error [MISSING_REQUIREMENT]: fake-orm requires a database.");
  });
});
