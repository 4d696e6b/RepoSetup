import { describe, expect, it } from "vitest";

import type { InstallationOperation } from "../operations/types.js";

import { consolidateManifestInstalls } from "./consolidate-manifests.js";

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

describe("consolidateManifestInstalls", () => {
  it("assembles multiple install policies into one package.json merge and install", () => {
    const result = consolidateManifestInstalls([
      install(["prettier@3.9.8"], { dev: true, exact: true, description: "Install Prettier" }),
      {
        type: "create_file",
        path: ".prettierrc",
        content: "{}\n",
        behavior: "fail_if_exists",
        description: "Add Prettier config",
      },
      install(["prisma@7.10.0"], {
        dev: true,
        allowBuild: ["prisma"],
        description: "Install Prisma CLI",
      }),
      install(["@prisma/client@7.10.0"], {
        allowBuild: ["esbuild"],
        description: "Install Prisma Client",
      }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.operations).toEqual([
      {
        type: "modify_json",
        path: "package.json",
        merge: {
          dependencies: { "@prisma/client": "7.10.0" },
          devDependencies: { prettier: "3.9.8", prisma: "7.10.0" },
        },
        behavior: "merge",
        description: "Assemble package.json dependencies before a consolidated install",
      },
      {
        type: "create_file",
        path: "pnpm-workspace.yaml",
        content: "allowBuilds:\n  esbuild: true\n  prisma: true\n",
        behavior: "create_if_missing",
        description: "Allow approved pnpm dependency build scripts",
      },
      {
        type: "create_file",
        path: ".prettierrc",
        content: "{}\n",
        behavior: "fail_if_exists",
        description: "Add Prettier config",
      },
      {
        type: "run_command",
        command: "pnpm",
        args: ["install", "--prefer-offline"],
        cwd: ".",
        description: "Install assembled package.json dependencies",
        requiresNetwork: true,
      },
    ]);
  });

  it("leaves a single install_package unchanged", () => {
    const operations = [install(["zod@4.6.5"])];
    expect(consolidateManifestInstalls(operations)).toEqual({
      ok: true,
      operations,
    });
  });

  it("does not consolidate across run_command barriers", () => {
    const operations: InstallationOperation[] = [
      install(["zod@4.6.5"]),
      {
        type: "run_command",
        command: "pnpm",
        args: ["exec", "prisma", "generate"],
        cwd: ".",
        description: "Generate",
      },
      install(["left-pad@1.3.0"]),
    ];
    expect(consolidateManifestInstalls(operations)).toEqual({
      ok: true,
      operations,
    });
  });
});
