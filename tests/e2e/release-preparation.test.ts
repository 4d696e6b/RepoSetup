import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { repoRoot } from "./harness.js";

const execute = promisify(execFile);
const preparation = await import(
  pathToFileURL(path.join(repoRoot, "scripts/prepare-release-version.mjs")).href
);
const directories: string[] = [];
const packageNames = ["cli", "core", "integrations", "registry"];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function git(directory: string, args: string[]) {
  return (await execute("git", args, { cwd: directory })).stdout.trim();
}

async function workspace(version = "0.3.0") {
  const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-release-preparation-"));
  directories.push(directory);
  for (const name of packageNames) {
    const packageDirectory = path.join(directory, "packages", name);
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      path.join(packageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: name === "cli" ? "rsetup" : `@reposetup/${name}`,
          version: name === "cli" ? "0.3.0-alpha.1" : "0.1.1",
          private: name !== "cli",
          description: "Retained package description",
          dependencies: { example: "1.2.3" },
        },
        null,
        2,
      )}\n`,
    );
  }
  await git(directory, ["init", "--initial-branch=baseline"]);
  await git(directory, ["config", "user.name", "Release fixture"]);
  await git(directory, ["config", "user.email", "release-fixture@example.invalid"]);
  await git(directory, ["add", "."]);
  await git(directory, ["commit", "-m", "fixture baseline"]);
  await git(directory, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
  await git(directory, ["branch", "codex/0.3.0-candidate-integration"]);
  await git(directory, ["branch", "codex/0.4.0-task-compiler"]);
  await git(directory, ["switch", "-c", `codex/release-${version}`]);
  return directory;
}

async function manifests(directory: string) {
  return Promise.all(
    packageNames.map(async (name) =>
      JSON.parse(await readFile(path.join(directory, "packages", name, "package.json"), "utf8")),
    ),
  );
}

describe("future release version finalization", () => {
  it.each(["0.3.0", "0.4.0"])("previews %s without changing manifests or git", async (version) => {
    const workspaceRoot = await workspace(version);
    const before = await manifests(workspaceRoot);
    const head = await git(workspaceRoot, ["rev-parse", "HEAD"]);
    const result = await preparation.prepareReleaseVersion({ workspaceRoot, version });
    expect(result.written).toBe(false);
    expect(result.changes).toHaveLength(4);
    expect(result.releaseBranch).toBe(`codex/release-${version}`);
    expect(await manifests(workspaceRoot)).toEqual(before);
    expect(await git(workspaceRoot, ["status", "--porcelain"])).toBe("");
    expect(await git(workspaceRoot, ["rev-parse", "HEAD"])).toBe(head);
  });

  it.each(["0.3.0", "0.4.0"])("finalizes only the four versions for %s", async (version) => {
    const workspaceRoot = await workspace(version);
    const before = await manifests(workspaceRoot);
    const head = await git(workspaceRoot, ["rev-parse", "HEAD"]);
    await preparation.prepareReleaseVersion({ workspaceRoot, version, write: true });
    expect(await manifests(workspaceRoot)).toEqual(
      before.map((manifest) => ({ ...manifest, version })),
    );
    expect(await git(workspaceRoot, ["rev-parse", "HEAD"])).toBe(head);
    expect((await git(workspaceRoot, ["diff", "--name-only"])).split("\n").sort()).toEqual(
      packageNames.map((name) => `packages/${name}/package.json`).sort(),
    );
    await git(workspaceRoot, ["commit", "-am", "finalize versions"]);
    expect(
      (await preparation.prepareReleaseVersion({ workspaceRoot, version, write: true })).changes,
    ).toEqual([]);
  });

  it("refuses write on an implementation branch while allowing preview", async () => {
    const workspaceRoot = await workspace();
    await git(workspaceRoot, ["switch", "codex/0.3.0-candidate-integration"]);
    const before = await manifests(workspaceRoot);
    await expect(
      preparation.prepareReleaseVersion({ workspaceRoot, version: "0.3.0", write: true }),
    ).rejects.toMatchObject({ code: "RELEASE_PREPARATION_BRANCH" });
    expect(
      (await preparation.prepareReleaseVersion({ workspaceRoot, version: "0.3.0" })).changes,
    ).toHaveLength(4);
    expect(await manifests(workspaceRoot)).toEqual(before);
  });

  it("refuses uncommitted changes before changing any version", async () => {
    const workspaceRoot = await workspace();
    await writeFile(path.join(workspaceRoot, "pending.txt"), "unfinished implementation");
    const before = await manifests(workspaceRoot);
    await expect(
      preparation.prepareReleaseVersion({ workspaceRoot, version: "0.3.0", write: true }),
    ).rejects.toMatchObject({ code: "RELEASE_PREPARATION_DIRTY" });
    expect(await manifests(workspaceRoot)).toEqual(before);
  });

  it.each(["refs/heads/codex/0.3.0-candidate-integration", "refs/remotes/origin/main"])(
    "requires the latest known %s to be included",
    async (reference) => {
      const workspaceRoot = await workspace();
      await git(workspaceRoot, ["switch", "-c", "newer-source"]);
      await writeFile(path.join(workspaceRoot, "new-source.txt"), "new source");
      await git(workspaceRoot, ["add", "."]);
      await git(workspaceRoot, ["commit", "-m", "new source"]);
      await git(workspaceRoot, ["update-ref", reference, "HEAD"]);
      await git(workspaceRoot, ["switch", "codex/release-0.3.0"]);
      const before = await manifests(workspaceRoot);
      await expect(
        preparation.prepareReleaseVersion({ workspaceRoot, version: "0.3.0", write: true }),
      ).rejects.toMatchObject({ code: "RELEASE_PREPARATION_BASELINE" });
      expect(await manifests(workspaceRoot)).toEqual(before);
    },
  );

  it("preflights all package identities before writing", async () => {
    const workspaceRoot = await workspace();
    const manifestPath = path.join(workspaceRoot, "packages", "registry", "package.json");
    await writeFile(
      manifestPath,
      JSON.stringify({ name: "@reposetup/registry", version: "0.1.1", private: false }),
    );
    await git(workspaceRoot, ["commit", "-am", "bad private identity"]);
    const before = await manifests(workspaceRoot);
    await expect(
      preparation.prepareReleaseVersion({ workspaceRoot, version: "0.3.0", write: true }),
    ).rejects.toMatchObject({ code: "RELEASE_PREPARATION_PACKAGE" });
    expect(await manifests(workspaceRoot)).toEqual(before);
  });

  it("refuses linked manifests without changing the link target", async () => {
    const workspaceRoot = await workspace();
    const manifestPath = path.join(workspaceRoot, "packages", "core", "package.json");
    const target = path.join(workspaceRoot, "linked-package.json");
    const before = await readFile(manifestPath, "utf8");
    await writeFile(target, before);
    await rm(manifestPath);
    await symlink(target, manifestPath);
    await expect(
      preparation.prepareReleaseVersion({ workspaceRoot, version: "0.3.0" }),
    ).rejects.toMatchObject({ code: "RELEASE_PREPARATION_PATH" });
    expect(await readFile(target, "utf8")).toBe(before);
  });

  it.each([
    ["--version", "0.3.0-alpha.1"],
    ["--version", "0.5.0"],
    ["--version", "0.3.0$(id)"],
    ["--version", "0.3.0", "--force"],
    ["--version", "0.3.0", "--write", "--write"],
    ["--version"],
  ])("rejects unsupported or malformed arguments %s", (...arguments_) => {
    expect(() => preparation.parsePreparationArguments(arguments_)).toThrow();
  });
});
