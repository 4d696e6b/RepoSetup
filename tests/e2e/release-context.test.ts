import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { repoRoot } from "./harness.js";

const releaseContext = await import(
  pathToFileURL(path.join(repoRoot, "scripts/release-context.mjs")).href
);
const sha = "0123456789abcdef0123456789abcdef01234567";
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function workspace(version: string, libraryVersion = version) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-release-context-"));
  directories.push(directory);
  await Promise.all(
    ["cli", "core", "integrations", "registry"].map(async (name) => {
      const packageDirectory = path.join(directory, "packages", name);
      await mkdir(packageDirectory, { recursive: true });
      await writeFile(
        path.join(packageDirectory, "package.json"),
        JSON.stringify({
          name: name === "cli" ? "rsetup" : `@reposetup/${name}`,
          version: name === "cli" ? version : libraryVersion,
          private: name !== "cli",
        }),
      );
    }),
  );
  return directory;
}

function source(version: string) {
  return {
    GITHUB_REPOSITORY: "4d696e6b/RepoSetup",
    GITHUB_REF: `refs/tags/v${version}`,
    GITHUB_SHA: sha,
  };
}

describe("manifest-derived release context", () => {
  it.each(["0.2.3", "0.3.0", "0.4.0"])("accepts finalized stable workspace %s", async (version) => {
    const workspaceRoot = await workspace(version);
    const context = await releaseContext.readReleaseContext({ workspaceRoot, stableOnly: true });
    expect(context).toEqual({ packageName: "rsetup", version, tag: `v${version}` });
    expect(() => releaseContext.assertStableReleaseSource(context, source(version))).not.toThrow();
  });

  it.each(["0.3.0-alpha.1", "0.4.0-alpha.1"])(
    "accepts candidate %s with older private libraries but blocks stable publication",
    async (version) => {
      const workspaceRoot = await workspace(version, "0.1.1");
      const context = await releaseContext.readReleaseContext({ workspaceRoot });
      expect(context.version).toBe(version);
      await expect(
        releaseContext.readReleaseContext({ workspaceRoot, stableOnly: true }),
      ).rejects.toMatchObject({ code: "RELEASE_UNSTABLE_VERSION" });
      expect(() => releaseContext.assertStableReleaseSource(context, source(version))).toThrow(
        "without a prerelease suffix",
      );
    },
  );

  it.each(["0.3.0", "0.4.0"])("blocks unfinalized workspace versions for %s", async (version) => {
    const workspaceRoot = await workspace(version, "0.1.1");
    expect((await releaseContext.readReleaseContext({ workspaceRoot })).version).toBe(version);
    await expect(
      releaseContext.readReleaseContext({ workspaceRoot, stableOnly: true }),
    ).rejects.toMatchObject({ code: "RELEASE_WORKSPACE_VERSION_MISMATCH" });
  });

  it("requires libraries to remain private for candidates and stable releases", async () => {
    const workspaceRoot = await workspace("0.3.0");
    await writeFile(
      path.join(workspaceRoot, "packages", "core", "package.json"),
      JSON.stringify({ name: "@reposetup/core", version: "0.3.0", private: false }),
    );
    await expect(releaseContext.readReleaseContext({ workspaceRoot })).rejects.toMatchObject({
      code: "RELEASE_PRIVATE_WORKSPACE_REQUIRED",
    });
    await expect(
      releaseContext.readReleaseContext({ workspaceRoot, stableOnly: true }),
    ).rejects.toMatchObject({ code: "RELEASE_PRIVATE_WORKSPACE_REQUIRED" });
  });

  it("rejects a renamed or private public package", async () => {
    const workspaceRoot = await workspace("0.3.0");
    const manifest = path.join(workspaceRoot, "packages", "cli", "package.json");
    for (const value of [
      { name: "unrelated-package", version: "0.3.0" },
      { name: "rsetup", version: "0.3.0", private: true },
    ]) {
      await writeFile(manifest, JSON.stringify(value));
      await expect(releaseContext.readReleaseContext({ workspaceRoot })).rejects.toMatchObject({
        code: "RELEASE_INVALID_PACKAGE",
      });
    }
  });

  it.each([
    undefined,
    "latest",
    "v0.3.0",
    "01.3.0",
    "0.3.0-alpha.01",
    "0.3.0+local",
    "0.3.0\n",
    "0.3.0/../../latest",
    "0.3.0$(id)",
  ])("rejects malformed or injectable version %s", (version) => {
    expect(() => releaseContext.validateReleaseVersion(version)).toThrow("valid version");
  });

  it.each(["0.3.0", "0.4.0"])(
    "requires matching immutable tag and official source for %s",
    (version) => {
      const context = { version };
      expect(() =>
        releaseContext.assertStableReleaseSource(context, {
          ...source(version),
          GITHUB_REF: "refs/heads/main",
        }),
      ).toThrow("exact");
      expect(() =>
        releaseContext.assertStableReleaseSource(context, {
          ...source(version),
          GITHUB_REF: "refs/tags/v0.2.3",
        }),
      ).toThrow("exact");
      expect(() =>
        releaseContext.assertStableReleaseSource(context, {
          ...source(version),
          GITHUB_REPOSITORY: "attacker/RepoSetup",
        }),
      ).toThrow("official repository");
      expect(() =>
        releaseContext.assertStableReleaseSource(context, {
          ...source(version),
          GITHUB_SHA: "not-a-sha",
        }),
      ).toThrow("exact");
      expect(() =>
        releaseContext.assertStableReleaseSource(context, {
          ...source(version),
          GITHUB_SHA: `${sha}\n`,
        }),
      ).toThrow("exact");
    },
  );
});
