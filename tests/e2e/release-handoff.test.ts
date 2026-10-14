import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { repoRoot } from "./harness.js";

const handoff = await import(
  pathToFileURL(path.join(repoRoot, "scripts/release-handoff.mjs")).href
);
const directories: string[] = [];
const digest = "a".repeat(64);
const identity = (version: string) => ({ record: { package: "rsetup", version, sha256: digest } });

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function workspace(pin?: { version: string; artifactSha256: string }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-release-handoff-"));
  directories.push(directory);
  if (pin !== undefined) {
    const folder = path.join(directory, "apps/website/src");
    await mkdir(folder, { recursive: true });
    await writeFile(
      path.join(folder, "handoff.ts"),
      `export const handoff = ${JSON.stringify(pin)};\n`,
    );
  }
  return directory;
}

describe("version-aware website artifact binding", () => {
  it.each(["0.3.0", "0.4.0", "0.5.0", "1.0.0"])("requires stable %s on every ref", (version) => {
    for (const refName of ["main", `v${version}`, "arbitrary-branch", ""]) {
      expect(handoff.requiresWebsiteBinding(version, refName)).toBe(true);
    }
  });

  it("retains independent CLI alpha qualification and the earlier stable line", async () => {
    const workspaceRoot = await workspace();
    for (const [version, refName] of [
      ["0.3.0-alpha.1", "codex/0.3.0-cli"],
      ["0.4.0-alpha.1", "codex/0.4.0-task-compiler"],
      ["0.2.3", "main"],
    ]) {
      expect(await handoff.verifyReleaseHandoff({ version, refName, workspaceRoot })).toEqual({
        required: false,
      });
    }
  });

  it.each(["codex/0.3.0-candidate-integration", "codex/release-0.3.0", "codex/release-0.4.0"])(
    "requires coupled alpha binding on %s",
    async (refName) => {
      const workspaceRoot = await workspace();
      await expect(
        handoff.verifyReleaseHandoff({ version: "0.3.0-alpha.1", refName, workspaceRoot }),
      ).rejects.toMatchObject({ code: "RELEASE_HANDOFF_REQUIRED" });
    },
  );

  it.each(["0.3.0", "0.4.0"])(
    "accepts only the matching verified artifact for %s",
    async (version) => {
      const workspaceRoot = await workspace({ version, artifactSha256: digest });
      expect(
        await handoff.verifyReleaseHandoff({ identity: identity(version), version, workspaceRoot }),
      ).toEqual({ required: true, version, sha256: digest });
      for (const record of [
        { ...identity(version).record, package: "unrelated" },
        { ...identity(version).record, version: "0.2.3" },
        { ...identity(version).record, sha256: "b".repeat(64) },
      ]) {
        await expect(
          handoff.verifyReleaseHandoff({ identity: { record }, version, workspaceRoot }),
        ).rejects.toMatchObject({ code: "RELEASE_HANDOFF_MISMATCH" });
      }
    },
  );

  it("rejects missing, stale and malformed stable pins", async () => {
    for (const pin of [
      undefined,
      { version: "0.3.0-alpha.1", artifactSha256: digest },
      { version: "0.3.0", artifactSha256: "invalid" },
    ]) {
      const workspaceRoot = await workspace(pin);
      await expect(
        handoff.verifyReleaseHandoff({
          identity: identity("0.3.0"),
          version: "0.3.0",
          workspaceRoot,
        }),
      ).rejects.toMatchObject({
        code: pin === undefined ? "RELEASE_HANDOFF_REQUIRED" : "RELEASE_HANDOFF_MISMATCH",
      });
    }
  });

  it("verifies the retained handoff before registry lookup or publication", async () => {
    const { readFile } = await import("node:fs/promises");
    const publisher = await readFile(
      path.join(repoRoot, "scripts/publish-qualified-artifact.mjs"),
      "utf8",
    );
    expect(publisher.indexOf("await verifyReleaseHandoff({ identity")).toBeGreaterThan(
      publisher.indexOf('await verifyArtifactIdentity("candidate"'),
    );
    expect(publisher.indexOf("await verifyReleaseHandoff({ identity")).toBeLessThan(
      publisher.indexOf("const existing = await registryVersion"),
    );
  });
});
