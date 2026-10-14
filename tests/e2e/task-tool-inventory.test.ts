import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
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

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function tool(checkout: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-tool-inventory-"));
  roots.push(root);
  await mkdir(path.join(root, "bin"));
  await mkdir(path.join(root, "node_modules/.bin"), { recursive: true });
  await writeFile(path.join(root, "package.json"), '{"name":"fictional-tool","version":"1"}\n');
  await writeFile(path.join(root, "bin/tool.js"), "console.log('published');\n");
  await writeFile(path.join(root, "node_modules/.bin/tool"), `#!/bin/sh\n${checkout}/tool.js\n`);
  return root;
}

describe("portable frozen published-tool identity", () => {
  it("excludes checkout-specific pnpm wrappers while binding published executable bytes", async () => {
    const first = await tool("/first/check-out");
    const second = await tool("/other/check-out");
    expect(await inventory(first, { ignorePackageLaunchers: true })).toEqual(
      await inventory(second, { ignorePackageLaunchers: true }),
    );
    expect(await inventory(first)).not.toEqual(await inventory(second));
    await writeFile(path.join(second, "bin/tool.js"), "console.log('tampered');\n");
    expect(await inventory(first, { ignorePackageLaunchers: true })).not.toEqual(
      await inventory(second, { ignorePackageLaunchers: true }),
    );
  });

  it("retains other nested files and rejects links outside the generated wrapper directory", async () => {
    const root = await tool("/check-out");
    await writeFile(path.join(root, "node_modules/unexpected.js"), "changed\n");
    expect(await inventory(root, { ignorePackageLaunchers: true })).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "node_modules/unexpected.js" })]),
    );
    await symlink("tool.js", path.join(root, "bin/link.js"));
    await expect(inventory(root, { ignorePackageLaunchers: true })).rejects.toThrow(
      "Fixture links",
    );
  });
});
