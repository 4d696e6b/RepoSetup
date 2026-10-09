import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inventory } from "../tasks/fixture-tools.js";

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
    expect(await inventory(first, { publishedTool: true })).toEqual(
      await inventory(second, { publishedTool: true }),
    );
    expect(await inventory(first)).not.toEqual(await inventory(second));
    await writeFile(path.join(second, "bin/tool.js"), "console.log('tampered');\n");
    expect(await inventory(first, { publishedTool: true })).not.toEqual(
      await inventory(second, { publishedTool: true }),
    );
  });

  it("retains other nested files and rejects links outside the generated wrapper directory", async () => {
    const root = await tool("/check-out");
    await writeFile(path.join(root, "node_modules/unexpected.js"), "changed\n");
    expect(await inventory(root, { publishedTool: true })).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "node_modules/unexpected.js" })]),
    );
    await symlink("tool.js", path.join(root, "bin/link.js"));
    await expect(inventory(root, { publishedTool: true })).rejects.toThrow("Fixture links");
  });
});
