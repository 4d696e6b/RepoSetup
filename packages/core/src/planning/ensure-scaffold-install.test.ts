import { describe, expect, it } from "vitest";

import type { InstallationOperation } from "../operations/types.js";

import { ensureScaffoldDependencyInstall } from "./ensure-scaffold-install.js";

describe("ensureScaffoldDependencyInstall", () => {
  it("does not insert an install when a later install_package covers the scaffold", () => {
    const operations: InstallationOperation[] = [
      {
        type: "run_command",
        command: "pnpm",
        args: ["create", "next-app@16.3.6", ".", "--skip-install", "--yes"],
        cwd: ".",
        description: "Scaffold Next.js",
        requiresNetwork: true,
      },
      {
        type: "install_package",
        packageManager: "pnpm",
        packages: ["zod"],
        cwd: ".",
        description: "Install Zod",
        requiresNetwork: true,
      },
    ];

    const result = ensureScaffoldDependencyInstall(operations, "pnpm", ".");
    expect(result).toEqual({ ok: true, operations });
  });

  it("inserts a project install when skip-install has no following package adds", () => {
    const scaffold: InstallationOperation = {
      type: "run_command",
      command: "pnpm",
      args: ["create", "next-app@16.3.6", ".", "--skip-install", "--yes"],
      cwd: ".",
      description: "Scaffold Next.js",
      requiresNetwork: true,
    };

    const result = ensureScaffoldDependencyInstall([scaffold], "pnpm", ".");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.operations).toEqual([
      scaffold,
      {
        type: "run_command",
        command: "pnpm",
        args: ["install", "--prefer-offline"],
        cwd: ".",
        description: "Install scaffold dependencies skipped by the generator",
        requiresNetwork: true,
      },
    ]);
  });

  it("does not move an install past a later run_command barrier", () => {
    const operations: InstallationOperation[] = [
      {
        type: "run_command",
        command: "pnpm",
        args: ["create", "next-app@16.3.6", ".", "--skip-install", "--yes"],
        cwd: ".",
        description: "Scaffold Next.js",
        requiresNetwork: true,
      },
      {
        type: "run_command",
        command: "pnpm",
        args: ["exec", "prisma", "generate"],
        cwd: ".",
        description: "Generate",
      },
      {
        type: "install_package",
        packageManager: "pnpm",
        packages: ["zod"],
        cwd: ".",
        description: "Install Zod",
        requiresNetwork: true,
      },
    ];

    const result = ensureScaffoldDependencyInstall(operations, "pnpm", ".");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.operations[1]).toMatchObject({
      type: "run_command",
      command: "pnpm",
      args: ["install", "--prefer-offline"],
    });
    expect(result.operations[2]).toMatchObject({
      args: ["exec", "prisma", "generate"],
    });
  });
});
