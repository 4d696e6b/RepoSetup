import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

import { handoff } from "../apps/website/src/handoff.ts";

const evidencePath = process.argv[2];
if (!evidencePath) throw new Error("Pass the candidate-artifact.json path.");

const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (evidence.schemaVersion !== 1 || evidence.sourceSha !== sourceSha)
  throw new Error("Packed artifact evidence does not identify this exact source commit.");
if (evidence.package !== "rsetup" || evidence.version !== handoff.version)
  throw new Error("Packed artifact package/version differs from the website handoff.");
if (
  typeof evidence.artifact !== "string" ||
  !/^rsetup-[a-zA-Z0-9.-]+\.tgz$/.test(evidence.artifact)
)
  throw new Error("Packed artifact filename is invalid.");
const tarball = readFileSync(join(dirname(evidencePath), evidence.artifact));
const sha256 = createHash("sha256").update(tarball).digest("hex");
if (evidence.bytes !== tarball.length || evidence.sha256 !== sha256)
  throw new Error("Packed artifact bytes do not match their evidence record.");
if (sha256 !== handoff.artifactSha256)
  throw new Error("Packed artifact differs from the website's pinned candidate SHA-256.");

process.stdout.write(`Candidate artifact matches website pin: ${sha256}\n`);
