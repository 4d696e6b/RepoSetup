import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inventory } from "../tasks/fixture-tools.js";

describe("portable package payload fingerprints", () => {
  it("excludes only generated package launchers while retaining payload and dependency bytes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-tool-inventory-"));
    try {
      await mkdir(path.join(root, "node_modules/.bin"), { recursive: true });
      await mkdir(path.join(root, "node_modules/dependency"));
      await writeFile(path.join(root, "entry.js"), "export const value = 1;");
      await writeFile(path.join(root, "node_modules/dependency/index.js"), "dependency bytes");
      const launcher = path.join(root, "node_modules/.bin/tool");
      await writeFile(launcher, "launcher for /checkout/one");
      const before = await inventory(root, { ignorePackageLaunchers: true });
      await writeFile(launcher, "launcher for /checkout/two");
      expect(await inventory(root, { ignorePackageLaunchers: true })).toEqual(before);
      expect(before.map((row) => row.path)).toEqual([
        "entry.js",
        "node_modules/dependency/index.js",
      ]);
      expect((await inventory(root)).map((row) => row.path)).toContain("node_modules/.bin/tool");
      await writeFile(path.join(root, "entry.js"), "export const value = 2;");
      expect(await inventory(root, { ignorePackageLaunchers: true })).not.toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
