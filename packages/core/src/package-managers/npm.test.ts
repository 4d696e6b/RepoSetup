import { describe, expect, it } from "vitest";

import { npmAdapter } from "./npm.js";
import type { PackageManagerCommandResult } from "./types.js";

function expectArgs(result: PackageManagerCommandResult, command: string, args: string[]): void {
  expect(result).toEqual({
    ok: true,
    operation: {
      type: "run_command",
      command,
      args,
      cwd: ".",
      description: expect.any(String),
      requiresNetwork: true,
    },
  });
}

describe("npmAdapter", () => {
  it("adds packages with npm install", () => {
    const result = npmAdapter.add({
      packages: ["zod", "tailwindcss"],
      cwd: ".",
      description: "Install runtime packages",
    });

    expectArgs(result, "npm", ["install", "zod", "tailwindcss"]);
  });

  it("adds dev packages with --save-dev", () => {
    const result = npmAdapter.add({
      packages: ["vitest"],
      cwd: ".",
      description: "Install Vitest",
      dev: true,
    });

    expectArgs(result, "npm", ["install", "--save-dev", "vitest"]);
  });

  it("adds an exact version pin with --save-exact", () => {
    const result = npmAdapter.add({
      packages: ["prettier"],
      cwd: ".",
      description: "Install Prettier",
      dev: true,
      exact: true,
    });

    expectArgs(result, "npm", ["install", "--save-dev", "--save-exact", "prettier"]);
  });

  it("installs a frozen project with npm ci", () => {
    const result = npmAdapter.install({
      cwd: ".",
      description: "Install from package-lock.json",
      frozen: true,
    });

    expectArgs(result, "npm", ["ci"]);
  });

  it("installs the project from the lockfile with npm install", () => {
    const result = npmAdapter.install({
      cwd: ".",
      description: "Install npm dependencies",
    });

    expectArgs(result, "npm", ["install"]);
  });

  it("rejects a package spec that would be parsed as a CLI flag", () => {
    const result = npmAdapter.add({
      packages: ["--ignore-scripts"],
      cwd: ".",
      description: "Unsafe spec",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
  });

  it("rejects a cwd that leaves the project root", () => {
    const result = npmAdapter.add({
      packages: ["zod"],
      cwd: "../outside",
      description: "Escape the project",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
  });

  it("removes packages with npm uninstall", () => {
    const result = npmAdapter.remove({
      packages: ["zod"],
      cwd: ".",
      description: "Remove Zod",
    });

    expectArgs(result, "npm", ["uninstall", "zod"]);
  });

  it("rejects a package spec that would be parsed as a CLI flag on remove", () => {
    const result = npmAdapter.remove({
      packages: ["--ignore-scripts"],
      cwd: ".",
      description: "Unsafe spec",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
  });
});
