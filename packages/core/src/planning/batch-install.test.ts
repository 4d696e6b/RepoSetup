import { describe, expect, it } from "vitest";

import type { InstallationOperation } from "../operations/types.js";

import { batchInstallPackages } from "./batch-install.js";

function install(
  packages: string[],
  overrides: Partial<Extract<InstallationOperation, { type: "install_package" }>> = {},
): InstallationOperation {
  return {
    type: "install_package",
    packageManager: "pnpm",
    packages,
    cwd: ".",
    description: `Install ${packages.join(", ")}`,
    requiresNetwork: true,
    ...overrides,
  };
}

describe("batchInstallPackages", () => {
  it("merges compatible installs across soft operations", () => {
    const result = batchInstallPackages([
      install(["zod@4.6.5"]),
      {
        type: "create_file",
        path: "readme.md",
        content: "# demo\n",
        behavior: "fail_if_exists",
        description: "Add readme",
      },
      install(["left-pad@1.3.0"]),
    ]);

    expect(result).toEqual({
      ok: true,
      operations: [
        install(["zod@4.6.5", "left-pad@1.3.0"], {
          description: "Install zod@4.6.5, left-pad@1.3.0",
        }),
        {
          type: "create_file",
          path: "readme.md",
          content: "# demo\n",
          behavior: "fail_if_exists",
          description: "Add readme",
        },
      ],
    });
  });

  it("does not move installs across run_command barriers", () => {
    const result = batchInstallPackages([
      install(["zod@4.6.5"]),
      {
        type: "run_command",
        command: "pnpm",
        args: ["exec", "prisma", "generate"],
        cwd: ".",
        description: "Generate Prisma Client",
      },
      install(["left-pad@1.3.0"]),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.operations).toEqual([
      install(["zod@4.6.5"]),
      {
        type: "run_command",
        command: "pnpm",
        args: ["exec", "prisma", "generate"],
        cwd: ".",
        description: "Generate Prisma Client",
      },
      install(["left-pad@1.3.0"]),
    ]);
  });

  it("keeps dependency groups and exactness separate", () => {
    const result = batchInstallPackages([
      install(["prettier@3.9.8"], { dev: true, exact: true, description: "Install Prettier" }),
      install(["eslint@9.39.5"], { dev: true, description: "Install ESLint" }),
      install(["zod@4.6.5"], { description: "Install Zod" }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.operations).toEqual([
      install(["prettier@3.9.8"], { dev: true, exact: true, description: "Install Prettier" }),
      install(["eslint@9.39.5"], { dev: true, description: "Install ESLint" }),
      install(["zod@4.6.5"], { description: "Install Zod" }),
    ]);
  });

  it("unions allowBuild when merging", () => {
    const result = batchInstallPackages([
      install(["prisma@7.10.0"], {
        dev: true,
        allowBuild: ["prisma"],
        description: "Install Prisma CLI",
      }),
      install(["@types/better-sqlite3@9.6.0"], {
        dev: true,
        allowBuild: ["@prisma/engines"],
        description: "Install SQLite types",
      }),
    ]);

    expect(result).toEqual({
      ok: true,
      operations: [
        install(["prisma@7.10.0", "@types/better-sqlite3@9.6.0"], {
          dev: true,
          allowBuild: ["prisma", "@prisma/engines"],
          description: "Install prisma@7.10.0, @types/better-sqlite3@9.6.0",
        }),
      ],
    });
  });

  it("rejects conflicting version specs in the same policy", () => {
    const result = batchInstallPackages([install(["zod@4.6.5"]), install(["zod@4.0.0"])]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
    expect(result.error.message).toContain("zod");
  });

  it("deduplicates identical package specs", () => {
    const result = batchInstallPackages([install(["zod@4.6.5"]), install(["zod@4.6.5"])]);

    expect(result).toEqual({
      ok: true,
      operations: [
        install(["zod@4.6.5"], {
          description: "Install zod@4.6.5",
        }),
      ],
    });
  });
});
