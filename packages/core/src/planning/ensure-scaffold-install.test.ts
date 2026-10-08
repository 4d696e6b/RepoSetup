import { describe, expect, it } from "vitest";

import type { InstallationOperation } from "../operations/types.js";

import { ensureScaffoldDependencyInstall } from "./ensure-scaffold-install.js";

describe("ensureScaffoldDependencyInstall", () => {
  it("installs bare Vite scaffolds that declare no dependency install", () => {
    const scaffold: InstallationOperation = {
      type: "run_command",
      command: "npm",
      args: ["create", "vite@8.3.0", "app", "--", "--no-interactive"],
      cwd: ".",
      skipsDependencyInstall: true,
      description: "Scaffold Vite",
    };
    const result = ensureScaffoldDependencyInstall([scaffold], "npm", "app");
    expect(result).toEqual({
      ok: true,
      operations: [
        scaffold,
        expect.objectContaining({
          type: "run_command",
          command: "npm",
          args: ["install", "--include=dev", "--prefer-offline"],
          cwd: "app",
        }),
      ],
    });
  });

  it("applies generated dependency pins and build approvals before the solo install", () => {
    const operations: InstallationOperation[] = [
      {
        type: "run_command",
        command: "pnpm",
        args: ["create", "next-app@16.3.6", "app", "--skip-install", "--yes"],
        cwd: ".",
        description: "Scaffold",
      },
      {
        type: "modify_text",
        path: "app/pnpm-workspace.yaml",
        oldText: "sharp: false",
        newText: "sharp: true",
        description: "Approve the generated build",
      },
      {
        type: "modify_json",
        path: "app/package.json",
        merge: { devDependencies: { "eslint-config-next": "16.3.6" } },
        behavior: "merge",
        description: "Pin the generated dependency",
      },
      {
        type: "verify",
        command: "pnpm",
        args: ["exec", "tsc", "--noEmit"],
        cwd: "app",
        description: "Verify the scaffold",
      },
    ];
    const result = ensureScaffoldDependencyInstall(operations, "pnpm", "app");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operations).toEqual([
      ...operations.slice(0, 3),
      expect.objectContaining({
        type: "run_command",
        args: expect.arrayContaining(["install"]),
        cwd: "app",
      }),
      operations[3],
    ]);
  });

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
        args: ["install", "--no-frozen-lockfile", "--prod=false", "--prefer-offline"],
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
      args: ["install", "--no-frozen-lockfile", "--prod=false", "--prefer-offline"],
    });
    expect(result.operations[2]).toMatchObject({
      args: ["exec", "prisma", "generate"],
    });
  });
});
