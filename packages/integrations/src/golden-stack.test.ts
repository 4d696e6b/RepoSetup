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
      ["pnpm", "install", "--prefer-offline"],
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
      ["pnpm", "install", "--prefer-offline"],
      ["pnpm", "exec", "vitest", "run", "--passWithNoTests"],
      ["pnpm", "add", "zod@4.6.5"],
    ]);

    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "check_prerequisite", id: "node" }),
        expect.objectContaining({ type: "check_prerequisite", id: "pnpm" }),
        expect.objectContaining({
          type: "modify_json",
          path: "package.json",
          description: "Assemble package.json dependencies before a consolidated install",
        }),
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
