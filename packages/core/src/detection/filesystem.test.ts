import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { createNodeDetectionFs } from "./filesystem.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

it("reads ordinary project files but never follows linked files or parent directories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-detection-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "reposetup-detection-outside-"));
  roots.push(root, outside);
  await writeFile(path.join(root, "normal.txt"), "local\n");
  await writeFile(path.join(outside, "secret.txt"), "private-value\n");
  await mkdir(path.join(root, "inside"));
  await writeFile(path.join(root, "inside", "local.txt"), "nested\n");
  await symlink(path.join(outside, "secret.txt"), path.join(root, "linked.txt"));
  await symlink(outside, path.join(root, "linked-dir"));

  const files = createNodeDetectionFs(root);
  expect(await files.exists("normal.txt")).toBe(true);
  expect(await files.readText("normal.txt")).toBe("local\n");
  expect(await files.readText("inside/local.txt")).toBe("nested\n");
  for (const file of ["linked.txt", "linked-dir/secret.txt", "../secret.txt"]) {
    expect(await files.exists(file)).toBe(false);
    expect(await files.readText(file)).toBeUndefined();
  }
});
