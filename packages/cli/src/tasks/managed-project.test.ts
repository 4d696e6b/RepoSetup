import { describe, it, expect } from "vitest";
import { mkdir, mkdtemp, realpath, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateManagedTaskProject } from "./managed-project.js";

describe("narrow managed project metadata", () => {
  it("requires preinstalled single-package npm/pnpm metadata and rejects unsupported outputs without execution", async () => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-g-profile-")));
    try {
      await writeFile(
        path.join(root, "package.json"),
        JSON.stringify({
          name: "fixture",
          packageManager: "pnpm@12.5.1",
          scripts: { test: "untrusted command never run" },
        }),
      );
      await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      expect((await validateManagedTaskProject(root, ["src/a.ts"])).success).toBe(false);
      await mkdir(path.join(root, "node_modules"));
      expect((await validateManagedTaskProject(root, ["src/a.ts", "docs/phase.md"])).success).toBe(
        true,
      );
      expect((await validateManagedTaskProject(root, ["src/a.py"])).success).toBe(false);
      await writeFile(path.join(root, "package-lock.json"), "{}");
      expect((await validateManagedTaskProject(root, ["src/a.ts"])).success).toBe(false);
      await rm(path.join(root, "package-lock.json"));
      await writeFile(path.join(root, "package.json"), '{"workspaces":["packages/*"]}');
      expect((await validateManagedTaskProject(root, ["src/a.ts"])).success).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
