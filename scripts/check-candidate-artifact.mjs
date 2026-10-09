import { execFileSync } from "node:child_process";
import { dirname, basename } from "node:path";
import process from "node:process";

import { verifyArtifactIdentity } from "./artifact-identity.mjs";
import { readReleaseContext } from "./release-context.mjs";
import { requiresWebsiteBinding, verifyReleaseHandoff } from "./release-handoff.mjs";

const evidencePath = process.argv[2];
if (!evidencePath || basename(evidencePath) !== "candidate-artifact.json") {
  throw new Error("Pass the candidate-artifact.json path.");
}

const release = await readReleaseContext();
const refName = process.env.GITHUB_REF_NAME ?? "";
if (!requiresWebsiteBinding(release.version, refName)) {
  process.stdout.write(
    `Website artifact binding is not required for independent CLI candidate ${release.version}.\n`,
  );
} else {
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const identity = await verifyArtifactIdentity(dirname(evidencePath), {
    version: release.version,
    sourceSha,
  });
  await verifyReleaseHandoff({ identity, version: release.version, refName });
  process.stdout.write(`Candidate artifact matches website pin: ${identity.record.sha256}\n`);
}
