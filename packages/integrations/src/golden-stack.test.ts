import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseRepoSetupConfig, planInstallation } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const examplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../examples/reposetup.next-sqlite.json",
);

describe("golden Next.js/SQLite stack", () => {
  it("plans a stable dry-run from the example config", () => {
    const parsed = parseRepoSetupConfig(JSON.parse(readFileSync(examplePath, "utf8")));
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const result = planInstallation(parsed.config, createBuiltInRegistry());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.orderedIntegrations.map((item) => item.id)).toEqual([
      "node",
      "pnpm",
      "nextjs",
      "prettier",
      "sqlite",
      "prisma",
      "tailwind",
      "vitest",
      "zod",
    ]);

    const commands = result.operations
      .filter((operation) => operation.type === "run_command")
      .map((operation) => [operation.command, ...operation.args]);

    expect(commands).toEqual([
      [
        "pnpm",
        "create",
        "next-app@latest",
        ".",
        "--ts",
        "--eslint",
        "--app",
        "--no-tailwind",
        "--use-pnpm",
        "--yes",
      ],
      ["pnpm", "add", "--save-dev", "--save-exact", "prettier"],
      ["pnpm", "add", "--save-dev", "prisma", "@types/better-sqlite3"],
      ["pnpm", "add", "@prisma/client", "@prisma/adapter-better-sqlite3", "dotenv"],
      [
        "pnpm",
        "exec",
        "prisma",
        "init",
        "--datasource-provider",
        "sqlite",
        "--output",
        "../generated/prisma",
      ],
      ["pnpm", "add", "tailwindcss", "@tailwindcss/postcss", "postcss"],
      [
        "pnpm",
        "add",
        "--save-dev",
        "vitest",
        "@vitejs/plugin-react",
        "jsdom",
        "@testing-library/react",
        "@testing-library/dom",
        "vite-tsconfig-paths",
      ],
      ["pnpm", "add", "zod"],
    ]);

    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "check_prerequisite", id: "node" }),
        expect.objectContaining({ type: "check_prerequisite", id: "pnpm" }),
        expect.objectContaining({
          type: "add_env_example",
          path: ".env.example",
          entries: [{ key: "DATABASE_URL", placeholder: "file:./dev.db" }],
        }),
        expect.objectContaining({
          type: "create_file",
          path: "postcss.config.mjs",
        }),
        expect.objectContaining({
          type: "create_file",
          path: "vitest.config.mts",
        }),
        expect.objectContaining({
          type: "create_file",
          path: "lib/prisma.ts",
        }),
      ]),
    );
  });
});
