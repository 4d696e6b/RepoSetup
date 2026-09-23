import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseRepoSetupConfig, planInstallation } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";
import { plannedCommandArgv } from "./planned-commands.js";

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

    const commands = plannedCommandArgv(result.operations);

    expect(commands).toEqual([
      [
        "pnpm",
        "create",
        "next-app@16.3.6",
        ".",
        "--ts",
        "--eslint",
        "--app",
        "--no-src-dir",
        "--no-tailwind",
        "--import-alias",
        "@/*",
        "--use-pnpm",
        "--skip-install",
        "--yes",
      ],
      ["pnpm", "add", "--save-dev", "--save-exact", "prettier@3.9.8"],
      [
        "pnpm",
        "add",
        "--save-dev",
        "--allow-build=prisma",
        "--allow-build=@prisma/engines",
        "prisma@7.10.0",
        "@types/better-sqlite3@9.6.0",
      ],
      [
        "pnpm",
        "add",
        "--allow-build=esbuild",
        "--allow-build=!better-sqlite3",
        "@prisma/client@7.10.0",
        "@prisma/adapter-better-sqlite3@7.10.0",
        "dotenv@18.0.3",
      ],
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
      ["pnpm", "exec", "prisma", "generate"],
      ["pnpm", "add", "tailwindcss@4.3.3", "@tailwindcss/postcss@4.3.3", "postcss@8.5.28"],
      [
        "pnpm",
        "add",
        "--save-dev",
        "--allow-build=esbuild",
        "vitest@5.0.1",
        "@vitejs/plugin-react@6.1.1",
        "jsdom@28.1.0",
        "@testing-library/react@16.3.3",
        "@testing-library/dom@10.4.2",
        "vite-tsconfig-paths@6.1.1",
      ],
      ["pnpm", "exec", "vitest", "run", "--passWithNoTests"],
      ["pnpm", "add", "zod@4.6.5"],
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
          type: "modify_text",
          path: "app/globals.css",
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
