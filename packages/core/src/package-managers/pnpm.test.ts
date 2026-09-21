import { describe, expect, it } from "vitest";

import { pnpmAdapter } from "./pnpm.js";
import type { PackageManagerCommandResult } from "./types.js";

function expectArgs(result: PackageManagerCommandResult, args: string[]): void {
  expect(result).toEqual({
    ok: true,
    operation: {
      type: "run_command",
      command: "pnpm",
      args,
      cwd: ".",
      description: expect.any(String),
      requiresNetwork: true,
    },
  });
}

describe("pnpmAdapter", () => {
  it("adds packages with pnpm add", () => {
    const result = pnpmAdapter.add({
      packages: ["zod", "tailwindcss"],
      cwd: ".",
      description: "Install runtime packages",
    });

    expectArgs(result, ["add", "zod", "tailwindcss"]);
  });

  it("adds dev packages with --save-dev", () => {
    const result = pnpmAdapter.add({
      packages: ["vitest"],
      cwd: ".",
      description: "Install Vitest",
      dev: true,
    });

    expectArgs(result, ["add", "--save-dev", "vitest"]);
  });

  it("adds an exact version pin with --save-exact", () => {
    const result = pnpmAdapter.add({
      packages: ["prettier"],
      cwd: ".",
      description: "Install Prettier",
      dev: true,
      exact: true,
    });

    expectArgs(result, ["add", "--save-dev", "--save-exact", "prettier"]);
  });

  it("installs the project with pnpm install", () => {
    const result = pnpmAdapter.install({
      cwd: ".",
      description: "Install pnpm dependencies",
    });

    expectArgs(result, ["install"]);
  });
});
