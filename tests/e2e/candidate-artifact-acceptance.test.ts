import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupWorkspace,
  cliPackageVersion,
  keepOnFailure,
  repoRoot,
  runProcess,
} from "./harness.js";

const tempDirs: string[] = [];
const evidenceScript = path.join(repoRoot, "scripts", "write-artifact-evidence.mjs");
const acceptanceScript = path.join(repoRoot, "scripts", "verify-packed-artifact.mjs");
const sourceSha = "0123456789abcdef0123456789abcdef01234567";

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((directory) => cleanupWorkspace(directory, keep)));
});

describe("candidate packed-artifact acceptance", () => {
  it("installs one identified tarball outside the monorepo and launches both aliases", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-candidate-pack-"));
    tempDirs.push(directory);
    const packed = await runProcess(
      "pnpm",
      ["--filter", "rsetup", "pack", "--pack-destination", directory],
      { cwd: repoRoot },
    );
    expect(packed.exitCode, packed.stderr).toBe(0);

    const tarball = path.join(directory, `rsetup-${cliPackageVersion()}.tgz`);
    const evidence = path.join(directory, "candidate-artifact.json");
    const recorded = await runProcess(
      process.execPath,
      [evidenceScript, "--tarball", tarball, "--source-sha", sourceSha, "--output", evidence],
      { cwd: directory },
    );
    expect(recorded.exitCode, recorded.stderr).toBe(0);

    const accepted = await runProcess(
      process.execPath,
      [acceptanceScript, "--tarball", tarball, "--evidence", evidence],
      { cwd: directory },
    );
    expect(accepted.exitCode, accepted.stderr).toBe(0);
    const delivery = await import(
      pathToFileURL(path.join(repoRoot, "scripts/verify-registry-release.mjs")).href
    );
    await delivery.verifyDelivery(tarball);
  });
});
