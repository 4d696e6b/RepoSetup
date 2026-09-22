import { describe, expect, it } from "vitest";

import { createMemoryDetectionFs } from "../detection/filesystem.js";
import { readPackageJson } from "../detection/package-json.js";
import type { InstallationOperation } from "../operations/types.js";

import { filterSatisfiedOperations } from "./delta.js";

describe("filterSatisfiedOperations", () => {
  it("drops package adds, files, and env keys that already exist", async () => {
    const files = createMemoryDetectionFs({
      "package.json": JSON.stringify({
        dependencies: { zod: "4.0.0", prisma: "7.10.0" },
        scripts: { test: "vitest" },
      }),
      ".prettierrc": "{}\n",
      "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
      "generated/prisma/client.ts": "export {}\n",
      ".env.example": "DATABASE_URL=file:./dev.db\n",
      "vitest.config.mts": "export default {}\n",
    });
    const packageJson = await readPackageJson(files);
    const operations: InstallationOperation[] = [
      {
        type: "run_command",
        command: "pnpm",
        args: ["add", "zod"],
        cwd: ".",
        description: "Install Zod",
      },
      {
        type: "run_command",
        command: "pnpm",
        args: ["add", "left-pad"],
        cwd: ".",
        description: "Install missing package",
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
        args: ["exec", "prisma", "init", "--datasource-provider", "sqlite"],
        cwd: ".",
        description: "Initialize Prisma",
      },
      {
        type: "run_command",
        command: "pnpm",
        args: ["exec", "prisma", "generate"],
        cwd: ".",
        description: "Generate Prisma Client",
      },
      {
        type: "run_command",
        command: "pnpm",
        args: ["exec", "vitest", "run", "--passWithNoTests"],
        cwd: ".",
        description: "Load Vitest config",
      },
      {
        type: "modify_json",
        path: "package.json",
        merge: { scripts: { test: "vitest" } },
        behavior: "merge",
        description: "Add test script",
      },
      {
        type: "add_env_example",
        path: ".env.example",
        entries: [{ key: "DATABASE_URL", placeholder: "file:./dev.db" }],
        description: "Document DATABASE_URL",
      },
      {
        type: "show_message",
        message: "noise",
        description: "Skip messages on add",
      },
    ];

    const remaining = await filterSatisfiedOperations(operations, files, packageJson);
    expect(remaining).toEqual([
      expect.objectContaining({ description: "Install missing package" }),
    ]);
  });

  it("drops uv add when pyproject.toml already declares the package", async () => {
    const files = createMemoryDetectionFs({
      "pyproject.toml": '[project]\ndependencies = ["fastapi[standard]"]\n',
    });
    const remaining = await filterSatisfiedOperations(
      [
        {
          type: "run_command",
          command: "uv",
          args: ["add", "fastapi[standard]"],
          cwd: ".",
          description: "Install FastAPI",
        },
        {
          type: "run_command",
          command: "uv",
          args: ["add", "flask"],
          cwd: ".",
          description: "Install Flask",
        },
      ],
      files,
      undefined,
    );
    expect(remaining).toEqual([expect.objectContaining({ description: "Install Flask" })]);
  });

  it("drops uv init when pyproject.toml already exists", async () => {
    const files = createMemoryDetectionFs({
      "pyproject.toml": "[project]\nname = 'demo'\n",
    });
    const remaining = await filterSatisfiedOperations(
      [
        {
          type: "run_command",
          command: "uv",
          args: ["init", ".", "--bare", "--name", "demo"],
          cwd: ".",
          description: "Create a minimal uv pyproject.toml",
        },
      ],
      files,
      undefined,
    );
    expect(remaining).toEqual([]);
  });
});
