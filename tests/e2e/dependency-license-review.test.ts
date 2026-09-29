import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupWorkspace, keepOnFailure, repoRoot, runProcess } from "./harness.js";

const tempDirs: string[] = [];

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((directory) => cleanupWorkspace(directory, keep)));
});

describe("dependency license review", () => {
  it("records reviewed license categories without machine-specific dependency paths", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-license-review-"));
    tempDirs.push(directory);
    const output = path.join(directory, "dependency-licenses.json");
    const result = await runProcess(
      process.execPath,
      [path.join(repoRoot, "scripts", "check-dependency-licenses.mjs"), "--output", output],
      { cwd: repoRoot },
    );
    expect(result.exitCode, result.stderr).toBe(0);

    const review = JSON.parse(await readFile(output, "utf8")) as {
      schemaVersion: number;
      reviewedLicenses: Array<{ license: string; packageCount: number }>;
      unreviewedLicenses: string[];
    };
    expect(review.schemaVersion).toBe(1);
    expect(review.reviewedLicenses).toContainEqual(expect.objectContaining({ license: "MIT" }));
    expect(review.unreviewedLicenses).toEqual([]);
    expect(JSON.stringify(review)).not.toContain("node_modules");
  });
});
