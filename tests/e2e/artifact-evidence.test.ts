import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupWorkspace, keepOnFailure, repoRoot, runProcess } from "./harness.js";

const tempDirs: string[] = [];
const script = path.join(repoRoot, "scripts", "write-artifact-evidence.mjs");
const sourceSha = "0123456789abcdef0123456789abcdef01234567";

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((directory) => cleanupWorkspace(directory, keep)));
});

describe("candidate artifact evidence", () => {
  it("records the exact source SHA and SHA-256 of one packed artifact", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-artifact-evidence-"));
    tempDirs.push(directory);
    const tarball = path.join(directory, "rsetup-candidate.tgz");
    const output = path.join(directory, "evidence", "candidate-artifact.json");
    await writeFile(tarball, "candidate bytes\n", "utf8");

    const result = await runProcess(
      process.execPath,
      [script, "--tarball", tarball, "--source-sha", sourceSha, "--output", output],
      { cwd: directory },
    );
    expect(result.exitCode, result.stderr).toBe(0);

    const evidence = JSON.parse(await readFile(output, "utf8")) as Record<string, unknown>;
    expect(evidence).toMatchObject({
      schemaVersion: 1,
      package: "rsetup",
      sourceSha,
      artifact: "rsetup-candidate.tgz",
      bytes: 16,
      sha256: "02aa487a1c6c83a0c7a81c558c9f1ad14ec71786c0b4b141a57168ace99adadf",
    });
    expect(typeof evidence.version).toBe("string");
  });

  it("refuses an invalid source identity before writing evidence", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-artifact-invalid-"));
    tempDirs.push(directory);
    const tarball = path.join(directory, "rsetup-candidate.tgz");
    const output = path.join(directory, "candidate-artifact.json");
    await writeFile(tarball, "candidate bytes\n", "utf8");

    const result = await runProcess(
      process.execPath,
      [script, "--tarball", tarball, "--source-sha", "not-a-sha", "--output", output],
      { cwd: directory },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("40-character hexadecimal Git SHA");
    await expect(readFile(output, "utf8")).rejects.toThrow();
  });
});
