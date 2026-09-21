import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findProjectRoot } from "./project-root.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("findProjectRoot", () => {
  it("walks up from a nested directory to the nearest marker", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-root-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "package.json"), "{}\n");
    const nested = path.join(root, "src", "app");
    await mkdir(nested, { recursive: true });

    expect(await findProjectRoot(nested)).toBe(root);
  });

  it("prefers the nearest marker over a parent project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-root-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "package.json"), "{}\n");
    const nested = path.join(root, "packages", "app");
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(nested, "package.json"), "{}\n");

    expect(await findProjectRoot(nested)).toBe(nested);
  });

  it("returns undefined when no project markers exist", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-root-"));
    tempDirs.push(root);
    expect(await findProjectRoot(root)).toBeUndefined();
  });
});
