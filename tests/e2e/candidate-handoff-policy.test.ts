import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { repoRoot } from "./harness.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function fixture(version: string, withWebsite = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-handoff-policy-"));
  directories.push(root);
  await mkdir(path.join(root, "scripts"));
  for (const script of [
    "artifact-identity.mjs",
    "check-candidate-artifact.mjs",
    "release-context.mjs",
    "release-handoff.mjs",
  ]) {
    await copyFile(path.join(repoRoot, "scripts", script), path.join(root, "scripts", script));
  }
  for (const name of ["cli", "core", "integrations", "registry"]) {
    await mkdir(path.join(root, "packages", name), { recursive: true });
    await writeFile(
      path.join(root, "packages", name, "package.json"),
      JSON.stringify({
        name: name === "cli" ? "rsetup" : `@reposetup/${name}`,
        version,
        private: name !== "cli",
      }),
    );
  }
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=RepoSetup fixture",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      "fixture",
    ],
    { cwd: root },
  );
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const bytes = Buffer.from("identified test-only artifact bytes");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const directory = path.join(root, "candidate");
  const artifact = `rsetup-${version}.tgz`;
  await mkdir(directory);
  await writeFile(path.join(directory, artifact), bytes);
  await writeFile(
    path.join(directory, "candidate-artifact.json"),
    JSON.stringify({
      schemaVersion: 1,
      package: "rsetup",
      version,
      sourceSha,
      artifact,
      bytes: bytes.length,
      sha256,
    }),
  );
  if (withWebsite) {
    await mkdir(path.join(root, "apps", "website", "src"), { recursive: true });
    await writeFile(
      path.join(root, "apps", "website", "src", "handoff.ts"),
      `export const handoff = ${JSON.stringify({ version, commit: sourceSha, artifactSha256: sha256 })};\n`,
    );
  }
  return { root, directory, artifact };
}

function check(root: string, refName: string) {
  return execFileSync(
    process.execPath,
    [
      path.join(root, "scripts", "check-candidate-artifact.mjs"),
      path.join(root, "candidate", "candidate-artifact.json"),
    ],
    {
      cwd: root,
      env: { ...process.env, GITHUB_REF_NAME: refName },
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

describe("candidate handoff runtime binding", () => {
  it("keeps independent CLI alpha qualification usable without a website", async () => {
    const { root } = await fixture("0.3.0-alpha.1", false);
    expect(check(root, "codex/0.3.0-cli")).toContain("binding is not required");
  });

  it.each(["main", "v0.3.0", "codex/release-0.3.0"])(
    "binds stable candidate bytes on %s",
    async (refName) => {
      const { root, directory, artifact } = await fixture("0.3.0");
      expect(check(root, refName)).toContain("matches website pin");
      await writeFile(path.join(directory, artifact), "changed artifact bytes");
      expect(() => check(root, refName)).toThrow();
    },
  );

  it.each(["main", "v0.3.0"])(
    "refuses stable %s when the website pin is missing",
    async (refName) => {
      const { root } = await fixture("0.3.0", false);
      expect(() => check(root, refName)).toThrow();
    },
  );

  it("still binds canonical release alpha candidates", async () => {
    const { root } = await fixture("0.3.0-alpha.1", false);
    expect(() => check(root, "codex/release-0.3.0")).toThrow();
  });
});
