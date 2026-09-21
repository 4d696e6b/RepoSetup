import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { detectProject } from "@reposetup/core";
import { afterEach, describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("built-in detection of fixture projects", () => {
  it("identifies a Next.js/SQLite golden-style fixture", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-stack-fixture-"));
    tempDirs.push(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "example-next-app",
        dependencies: {
          next: "16.0.0",
          "@prisma/client": "7.10.0",
          tailwindcss: "4.0.0",
          zod: "4.0.0",
        },
        devDependencies: {
          prisma: "7.10.0",
          typescript: "5.9.0",
          vitest: "5.0.0",
          prettier: "3.0.0",
        },
        packageManager: "pnpm@12.5.1",
      }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "tsconfig.json"), "{}\n");
    await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
    await writeFile(path.join(root, "postcss.config.mjs"), "export default {};\n");
    await writeFile(path.join(root, "vitest.config.mts"), "export default {};\n");
    await writeFile(path.join(root, ".prettierrc"), "{}\n");
    await writeFile(path.join(root, ".env.example"), "DATABASE_URL=file:./dev.db\n");
    await mkdir(path.join(root, "app"));
    await writeFile(path.join(root, "app", "globals.css"), '@import "tailwindcss";\n');
    await mkdir(path.join(root, "prisma"));
    await writeFile(
      path.join(root, "prisma", "schema.prisma"),
      'generator client {\n  provider = "prisma-client"\n}\n\ndatasource db {\n  provider = "sqlite"\n}\n',
    );

    const result = await detectProject({
      startDir: root,
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.stack.runtimes.map((item) => item.id)).toEqual(["node"]);
    expect(result.stack.packageManagers.map((item) => item.id)).toEqual(["pnpm"]);
    expect(result.stack.frameworks.map((item) => item.id)).toEqual(["nextjs"]);
    expect(result.stack.language?.id).toBe("typescript");
    expect(result.stack.integrations.map((item) => item.id).sort()).toEqual([
      "prettier",
      "prisma",
      "sqlite",
      "tailwind",
      "vitest",
      "zod",
    ]);
  });

  it("identifies an npm Node project from package-lock.json", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-stack-fixture-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "npm-app" }));
    await writeFile(path.join(root, "package-lock.json"), JSON.stringify({ lockfileVersion: 3 }));

    const result = await detectProject({
      startDir: root,
      registry: createBuiltInRegistry(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.stack.runtimes.map((item) => item.id)).toEqual(["node"]);
    expect(result.stack.packageManagers.map((item) => item.id)).toEqual(["npm"]);
    expect(result.stack.frameworks).toEqual([]);
  });
});
