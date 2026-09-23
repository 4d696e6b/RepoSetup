import { describe, expect, it } from "vitest";

import { pipAdapter } from "./pip.js";
import type { PackageManagerCommandResult } from "./types.js";

function expectArgs(result: PackageManagerCommandResult, args: string[]): void {
  expect(result).toEqual({
    ok: true,
    operation: {
      type: "run_command",
      command: "python",
      args,
      cwd: ".",
      description: expect.any(String),
      requiresNetwork: true,
    },
  });
}

describe("pipAdapter", () => {
  it("adds packages with python -m pip install", () => {
    const result = pipAdapter.add({
      packages: ["fastapi", "sqlalchemy"],
      cwd: ".",
      description: "Install runtime packages",
    });

    expectArgs(result, ["-m", "pip", "install", "fastapi", "sqlalchemy"]);
  });

  it("does not invent a pip --dev flag", () => {
    const result = pipAdapter.add({
      packages: ["pytest"],
      cwd: ".",
      description: "Install pytest",
      dev: true,
    });

    expectArgs(result, ["-m", "pip", "install", "pytest"]);
  });

  it("installs from a requirements file with -r", () => {
    const result = pipAdapter.install({
      cwd: ".",
      description: "Install pip requirements",
      requirementsFile: "requirements.txt",
    });

    expectArgs(result, ["-m", "pip", "install", "-r", "requirements.txt"]);
  });

  it("refuses a frozen install because pip has no lockfile", () => {
    const result = pipAdapter.install({
      cwd: ".",
      description: "Install from a lockfile",
      frozen: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("UNSUPPORTED_CONTEXT");
  });

  it("requires a requirements file for project install", () => {
    const result = pipAdapter.install({
      cwd: ".",
      description: "Install pip requirements",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
  });

  it("rejects a requirements file that leaves the project root", () => {
    const result = pipAdapter.install({
      cwd: ".",
      description: "Install pip requirements",
      requirementsFile: "../secret.txt",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
  });

  it("refuses remove because pip uninstall does not update requirements.txt", () => {
    const result = pipAdapter.remove({
      packages: ["pydantic"],
      cwd: ".",
      description: "Remove Pydantic",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("UNSUPPORTED_CONTEXT");
    expect(result.error.message).toBe(
      "RepoSetup cannot safely remove this integration automatically.",
    );
  });
});
