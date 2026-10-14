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

function evidence(version = "0.2.3") {
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
    version,
    runs,
    jobs: runs.map(() =>
      (qualification.requiredQualificationJobs(version) as string[]).map((name) => ({
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
  };
}

describe("stable exact-source qualification gates", () => {
  it("accepts three consecutive complete runs without a calendar delay", () => {
    expect(qualification.validateQualification(evidence())).toEqual({
      artifactId: 123,
    });
    expect(qualification.parseRunIds("1, 2,3")).toEqual(["1", "2", "3"]);
  });

  it.each(["0.2.3", "0.3.0", "0.3.1"])("retains sixteen required jobs for %s", (version) => {
    expect(qualification.requiredJobs).toHaveLength(16);
    expect(qualification.requiredQualificationJobs(version)).toEqual(qualification.requiredJobs);
    expect(qualification.validateQualification(evidence(version))).toEqual({ artifactId: 123 });
  });

  it.each(["0.4.0", "0.4.1", "0.5.0", "1.0.0"])(
    "requires both task matrices for %s and later versions",
    (version) => {
      const required = qualification.requiredQualificationJobs(version) as string[];
      expect(required).toHaveLength(20);
      expect(required).toEqual(
        expect.arrayContaining([
          "Offline task qualification (ubuntu-24.04)",
          "Offline task qualification (macos-15)",
          "Full task verifier qualification (ubuntu-24.04)",
          "Full task verifier qualification (macos-15)",
        ]),
      );
      expect(qualification.validateQualification(evidence(version))).toEqual({ artifactId: 123 });
      for (const name of required.slice(16)) {
        const input = evidence(version);
        input.jobs[1] = input.jobs[1].filter((job) => job.name !== name);
        expect(() => qualification.validateQualification(input)).toThrow("missing a required");
      }
      const baselineOnly = evidence(version);
      baselineOnly.jobs = evidence("0.3.0").jobs;
      expect(() => qualification.validateQualification(baselineOnly)).toThrow("missing a required");
      const skippedTask = evidence(version);
      skippedTask.jobs[0][16].steps[0].conclusion = "skipped";
      expect(() => qualification.validateQualification(skippedTask)).toThrow("without skips");
    },
  );

  it.each(["0.3.0-alpha.1", "0.4.0-alpha.1"])(
    "rejects prerelease %s qualification as stable publication evidence",
    (version) => {
      const input = evidence();
      input.version = version;
      expect(() => qualification.validateQualification(input)).toThrow(
        "without a prerelease suffix",
      );
    },
  );

  it.each(["1,2", "1,2,2", "1,2,3,4", "1,2,$(id)", "0,2,3", "1,2,3\nmalicious"])(
    "rejects invalid or injectable run IDs %s",
    (value) => {
      expect(() => qualification.parseRunIds(value)).toThrow();
    },
  );

  it("rejects a changed candidate branch, source mismatch, or a fork", () => {
    const input = evidence();
    input.branchSha = "a".repeat(40);
    expect(() => qualification.validateQualification(input)).toThrow("Candidate branch");
    input.branchSha = sha;
    input.runs[0].head_sha = "b".repeat(40);
    expect(() => qualification.validateQualification(input)).toThrow("selected source");
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

  it("rejects stale selected runs and reattempts", () => {
    const input = evidence();
    input.latestRuns[0] = { ...input.runs[2], id: 4 };
    expect(() => qualification.validateQualification(input)).toThrow("latest three consecutive");
    input.latestRuns = [...input.runs].reverse();
    input.runs[0].run_attempt = 2;
    expect(() => qualification.validateQualification(input)).toThrow("first-attempt");
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
  it.each(["0.2.3", "0.3.0", "0.4.0", "0.3.0-alpha.1", "0.4.0-alpha.1"])(
    "rejects metadata changes and tampered %s bytes before execution",
    async (version) => {
      const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-release-gate-"));
      directories.push(directory);
      const bytes = Buffer.from("qualified bytes");
      const record = {
        schemaVersion: 1,
        package: "rsetup",
        version,
        sourceSha: sha,
        artifact: `rsetup-${version}.tgz`,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
      const file = path.join(directory, "candidate-artifact.json");
      await writeFile(path.join(directory, record.artifact), bytes);
      await writeFile(file, JSON.stringify(record));
      const identity = await artifacts.verifyArtifactIdentity(directory, {
        version,
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
    },
  );

  it.each(["0.2.3", "0.3.0", "0.4.0"])(
    "looks up exact version %s and only treats registry 404 as unpublished",
    async (version) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 403, ok: false }));
      await expect(publication.registryVersion(version)).rejects.toThrow("publication stopped");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404, ok: false }));
      await expect(publication.registryVersion(version)).resolves.toBeUndefined();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://registry.npmjs.org/rsetup/${version}`,
        expect.objectContaining({ signal: expect.anything() }),
      );
    },
  );

  it.each(["0.3.0", "0.4.0"])(
    "waits for npm to expose %s before verifying its identity",
    async (version) => {
      const metadata = { name: "rsetup", version };
      const lookup = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValue(metadata);
      await expect(
        publication.waitForRegistryVersion({ version, lookup, timeoutMs: 100, intervalMs: 0 }),
      ).resolves.toBe(metadata);
      expect(lookup).toHaveBeenCalledTimes(2);
      await expect(
        publication.waitForRegistryVersion({
          version,
          lookup: async () => undefined,
          timeoutMs: 0,
        }),
      ).rejects.toThrow("not yet visible");
    },
  );

  it.each(["0.2.3", "0.3.0", "0.4.0"])(
    "refuses to treat conflicting published %s as a successful retry",
    (version) => {
      const identity = { integrity: "sha512-qualified", record: { version } };
      const metadata = { name: "rsetup", version, dist: { integrity: identity.integrity } };
      expect(() => publication.verifyRegistryIdentity(metadata, identity, version)).not.toThrow();
      expect(() =>
        publication.verifyRegistryIdentity(
          { ...metadata, dist: { integrity: "sha512-different" } },
          identity,
          version,
        ),
      ).toThrow("never overwrite");
      expect(() =>
        publication.verifyRegistryIdentity({ ...metadata, version: "0.2.0" }, identity, version),
      ).toThrow("version");
      expect(() =>
        publication.verifyRegistryIdentity(
          metadata,
          { ...identity, record: { version: "0.2.0" } },
          version,
        ),
      ).toThrow("version");
    },
  );

  it.each(["0.3.0-alpha.1", "0.4.0-alpha.1", "0.3.0/../../latest"])(
    "rejects non-stable or malformed registry lookup %s before a request",
    async (version) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      await expect(publication.registryVersion(version)).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
