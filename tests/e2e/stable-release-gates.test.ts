import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { repoRoot } from "./harness.js";

const qualification = await import(
  pathToFileURL(path.join(repoRoot, "scripts/check-release-qualification.mjs")).href
);
const artifacts = await import(
  pathToFileURL(path.join(repoRoot, "scripts/artifact-identity.mjs")).href
);
const publication = await import(
  pathToFileURL(path.join(repoRoot, "scripts/publish-qualified-artifact.mjs")).href
);
const sha = "0123456789abcdef0123456789abcdef01234567";
const completed = "2026-10-01T12:00:00Z";
const directories: string[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function evidence() {
  const runs = [1, 2, 3].map((id) => ({
    id,
    run_number: id,
    run_attempt: 1,
    updated_at: completed,
    path: ".github/workflows/release.yml",
    event: "workflow_dispatch",
    head_sha: sha,
    head_branch: "codex/stable",
    repository: { full_name: "4d696e6b/RepoSetup" },
    head_repository: { full_name: "4d696e6b/RepoSetup" },
    status: "completed",
    conclusion: "success",
  }));
  return {
    runs,
    jobs: runs.map(() =>
      (qualification.requiredJobs as string[]).map((name) => ({
        name,
        status: "completed",
        conclusion: "success",
        completed_at: completed,
        steps: [{ status: "completed", conclusion: "success" }],
      })),
    ),
    latestRuns: [...runs].reverse(),
    artifact: {
      id: 123,
      name: "candidate-artifact",
      expired: false,
      workflow_run: { id: 3, head_sha: sha },
    },
    sourceSha: sha,
    branchSha: sha,
    now: Date.parse("2026-10-08T12:00:00Z"),
  };
}

describe("stable exact-source qualification gates", () => {
  it("accepts three consecutive complete runs at the seven-day boundary", () => {
    expect(qualification.validateQualification(evidence())).toEqual({
      artifactId: 123,
      soakEnd: "2026-10-08T12:00:00.000Z",
    });
    expect(qualification.parseRunIds("1, 2,3")).toEqual(["1", "2", "3"]);
  });

  it.each(["1,2", "1,2,2", "1,2,3,4", "1,2,$(id)", "0,2,3", "1,2,3\nmalicious"])(
    "rejects invalid or injectable run IDs %s",
    (value) => {
      expect(() => qualification.parseRunIds(value)).toThrow();
    },
  );

  it("rejects a changed frozen branch, source mismatch, or a fork", () => {
    const input = evidence();
    input.branchSha = "a".repeat(40);
    expect(() => qualification.validateQualification(input)).toThrow("Frozen candidate");
    input.branchSha = sha;
    input.runs[0].head_sha = "b".repeat(40);
    expect(() => qualification.validateQualification(input)).toThrow("frozen source");
    input.runs[0].head_sha = sha;
    input.runs[0].head_repository.full_name = "attacker/RepoSetup";
    expect(() => qualification.validateQualification(input)).toThrow("official workflow");
  });

  it("rejects a missing job even when the run reports success", () => {
    const input = evidence();
    input.jobs[1].pop();
    expect(() => qualification.validateQualification(input)).toThrow("missing a required");
  });

  it.each(["skipped", "failure", "cancelled"])("rejects a %s required step", (conclusion) => {
    const input = evidence();
    input.jobs[1][0].steps[0].conclusion = conclusion;
    expect(() => qualification.validateQualification(input)).toThrow("without skips");
  });

  it("rejects stale selected runs, reattempts, and an incomplete soak", () => {
    const input = evidence();
    input.latestRuns[0] = { ...input.runs[2], id: 4 };
    expect(() => qualification.validateQualification(input)).toThrow("latest three consecutive");
    input.latestRuns = [...input.runs].reverse();
    input.runs[0].run_attempt = 2;
    expect(() => qualification.validateQualification(input)).toThrow("first-attempt");
    input.runs[0].run_attempt = 1;
    input.now -= 1;
    expect(() => qualification.validateQualification(input)).toThrow("soak is incomplete");
  });

  it("rejects an expired artifact or one retained for a different run", () => {
    const input = evidence();
    input.artifact.expired = true;
    expect(() => qualification.validateQualification(input)).toThrow("unexpired");
    input.artifact.expired = false;
    input.artifact.workflow_run.id = 2;
    expect(() => qualification.validateQualification(input)).toThrow("final successful run");
  });
});

describe("stable artifact and registry identity", () => {
  it("rejects metadata changes and tampered bytes before execution", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-release-gate-"));
    directories.push(directory);
    const bytes = Buffer.from("qualified bytes");
    const record = {
      schemaVersion: 1,
      package: "rsetup",
      version: "0.2.0",
      sourceSha: sha,
      artifact: "rsetup-0.2.0.tgz",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    const file = path.join(directory, "candidate-artifact.json");
    await writeFile(path.join(directory, record.artifact), bytes);
    await writeFile(file, JSON.stringify(record));
    const identity = await artifacts.verifyArtifactIdentity(directory, {
      version: "0.2.0",
      sourceSha: sha,
    });
    expect(identity.integrity).toMatch(/^sha512-/);
    await expect(
      artifacts.verifyArtifactIdentity(directory, { sourceSha: "a".repeat(40) }),
    ).rejects.toThrow("source");
    await expect(
      artifacts.verifyArtifactIdentity(directory, { version: "0.2.0-alpha.1" }),
    ).rejects.toThrow("version");
    await writeFile(file, JSON.stringify({ ...record, bytes: record.bytes + 1 }));
    await expect(artifacts.verifyArtifactIdentity(directory)).rejects.toThrow("size");
    await writeFile(file, JSON.stringify(record));
    await writeFile(path.join(directory, record.artifact), "tampered  bytes");
    await expect(artifacts.verifyArtifactIdentity(directory)).rejects.toThrow("SHA-256");
  });

  it("only treats registry 404 as an unpublished version", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 403, ok: false }));
    await expect(publication.registryVersion()).rejects.toThrow("publication stopped");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404, ok: false }));
    await expect(publication.registryVersion()).resolves.toBeUndefined();
  });

  it("refuses to treat a conflicting published version as a successful retry", () => {
    const identity = { integrity: "sha512-qualified" };
    const metadata = { name: "rsetup", version: "0.2.0", dist: { integrity: identity.integrity } };
    expect(() => publication.verifyRegistryIdentity(metadata, identity)).not.toThrow();
    expect(() =>
      publication.verifyRegistryIdentity(
        { ...metadata, dist: { integrity: "sha512-different" } },
        identity,
      ),
    ).toThrow("never overwrite");
    expect(() =>
      publication.verifyRegistryIdentity({ ...metadata, version: "0.2.0-alpha.1" }, identity),
    ).toThrow("version");
  });
});
