import { describe, expect, it } from "vitest";

import type { PackageManagerCommandResult } from "./types.js";
import { uvAdapter } from "./uv.js";

function expectArgs(result: PackageManagerCommandResult, args: string[]): void {
  expect(result).toEqual({
    ok: true,
    operation: {
      type: "run_command",
      command: "uv",
      args,
      cwd: ".",
      description: expect.any(String),
      requiresNetwork: true,
    },
  });
}

describe("uvAdapter", () => {
  it("adds packages with uv add", () => {
    const result = uvAdapter.add({
      packages: ["fastapi", "sqlalchemy"],
      cwd: ".",
      description: "Install runtime packages",
    });

    expectArgs(result, ["add", "fastapi", "sqlalchemy"]);
  });

  it("adds development dependencies with --dev", () => {
    const result = uvAdapter.add({
      packages: ["pytest"],
      cwd: ".",
      description: "Install pytest",
      dev: true,
    });

    expectArgs(result, ["add", "--dev", "pytest"]);
  });

  it("syncs a frozen project only when uv.lock stays unchanged", () => {
    const result = uvAdapter.install({
      cwd: ".",
      description: "Install from uv.lock",
      frozen: true,
    });

    expectArgs(result, ["sync", "--locked"]);
  });

  it("installs the project with uv sync", () => {
    const result = uvAdapter.install({
      cwd: ".",
      description: "Sync uv project environment",
    });

    expectArgs(result, ["sync"]);
  });

  it("removes packages with uv remove and does not invent --dev", () => {
    const result = uvAdapter.remove({
      packages: ["pydantic", "ruff"],
      cwd: ".",
      description: "Remove packages",
    });

    expectArgs(result, ["remove", "pydantic", "ruff"]);
  });
});
