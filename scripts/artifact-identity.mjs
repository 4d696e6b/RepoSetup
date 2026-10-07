import { createHash } from "node:crypto";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";

export async function verifyArtifactIdentity(directory, expected = {}) {
  const files = await readdir(directory);
  const tarballs = files.filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1 || !files.includes("candidate-artifact.json")) {
    throw new Error("Candidate directory must contain exactly one tarball and its evidence.");
  }
  const tarball = path.resolve(directory, tarballs[0]);
  const stats = await lstat(tarball);
  const record = JSON.parse(
    await readFile(path.join(directory, "candidate-artifact.json"), "utf8"),
  );
  if (
    !stats.isFile() ||
    stats.size === 0 ||
    record.schemaVersion !== 1 ||
    record.package !== "rsetup" ||
    typeof record.version !== "string" ||
    !/^[0-9a-f]{40}$/.test(record.sourceSha) ||
    record.artifact !== tarballs[0] ||
    record.bytes !== stats.size ||
    !/^[0-9a-f]{64}$/.test(record.sha256) ||
    (expected.sourceSha !== undefined && record.sourceSha !== expected.sourceSha) ||
    (expected.version !== undefined && record.version !== expected.version)
  ) {
    throw new Error(
      "Artifact size, package, version, or source does not match its required identity.",
    );
  }
  const bytes = await readFile(tarball);
  if (createHash("sha256").update(bytes).digest("hex") !== record.sha256) {
    throw new Error("Artifact SHA-256 does not match its evidence record.");
  }
  return {
    tarball,
    record,
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  };
}
