import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

import { executeInstallation, parseRepoSetupConfig, planInstallation } from "@reposetup/core";
import { afterEach, describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const examplePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../examples/reposetup.next-sqlite.json",
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function failDetails(result: Awaited<ReturnType<typeof executeInstallation>>): string {
  if (result.ok) {
    return "";
  }

  return `${result.error.code}: ${result.error.message}\n${JSON.stringify(result.error.details, null, 2)}`;
}

describe("golden Next.js/SQLite stack execution", () => {
  it(
    "installs the example stack and verifies Prisma, Vitest config, and Next.js build",
    { timeout: 900_000 },
    async () => {
      const parent = await mkdtemp(path.join(os.tmpdir(), "reposetup-golden-"));
      tempDirs.push(parent);
      const root = path.join(parent, "example-next-app");
      await mkdir(root);

      const parsed = parseRepoSetupConfig(JSON.parse(readFileSync(examplePath, "utf8")));
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        return;
      }

      const planned = planInstallation(parsed.config, createBuiltInRegistry());
      expect(planned.valid).toBe(true);

      const installed = await executeInstallation(planned.operations, { rootDir: root });
      expect(installed.ok, failDetails(installed)).toBe(true);

      const globals = await readFile(path.join(root, "app/globals.css"), "utf8");
      expect(globals).toContain('@import "tailwindcss"');
      await access(path.join(root, "postcss.config.mjs"));
      await access(path.join(root, "lib/prisma.ts"));
      await access(path.join(root, "vitest.config.mts"));
      await access(path.join(root, ".env.example"));
      await access(path.join(root, "generated/prisma"));
      expect(await readFile(path.join(root, ".env.example"), "utf8")).toContain("DATABASE_URL=");

      const built = await executeInstallation(
        [
          {
            type: "verify",
            cwd: ".",
            command: "pnpm",
            args: ["exec", "next", "build"],
            description: "Build the generated Next.js app",
          },
        ],
        { rootDir: root },
      );
      expect(built.ok, failDetails(built)).toBe(true);
    },
  );
});
