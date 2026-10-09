import { spawn } from "node:child_process";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import { verifyArtifactIdentity } from "./artifact-identity.mjs";
import {
  assertStableReleaseSource,
  readReleaseContext,
  validateReleaseVersion,
} from "./release-context.mjs";
import { verifyReleaseHandoff } from "./release-handoff.mjs";

export function verifyRegistryIdentity(metadata, identity, expectedVersion) {
  const version = validateReleaseVersion(expectedVersion, { stableOnly: true });
  if (
    metadata?.name !== "rsetup" ||
    metadata.version !== version ||
    identity.record?.version !== version ||
    metadata.dist?.integrity !== identity.integrity
  ) {
    throw new Error(
      "Registry version or integrity differs from the qualified artifact; never overwrite an existing version.",
    );
  }
}

export async function registryVersion(expectedVersion) {
  const version = validateReleaseVersion(expectedVersion, { stableOnly: true });
  const response = await globalThis.fetch(`https://registry.npmjs.org/rsetup/${version}`, {
    signal: globalThis.AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return undefined;
  if (!response.ok)
    throw new Error(`npm registry lookup failed (${response.status}); publication stopped.`);
  return response.json();
}

export async function waitForRegistryVersion({
  version,
  timeoutMs = 20 * 60_000,
  intervalMs = 15_000,
  lookup = () => registryVersion(version),
} = {}) {
  const deadline = performance.now() + timeoutMs;
  while (true) {
    const metadata = await lookup();
    if (metadata) return metadata;
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      throw new Error(
        "npm accepted the publish, but the version is not yet visible in the registry; retain this run and check visibility before a safe retry.",
      );
    }
    await delay(Math.min(intervalMs, remaining));
  }
}

async function main() {
  const release = await readReleaseContext({ stableOnly: true });
  assertStableReleaseSource(release, process.env);
  const identity = await verifyArtifactIdentity("candidate", {
    version: release.version,
    sourceSha: process.env.GITHUB_SHA,
  });
  await verifyReleaseHandoff({ identity, version: release.version });
  const existing = await registryVersion(release.version);
  if (existing) {
    verifyRegistryIdentity(existing, identity, release.version);
    process.stdout.write(
      `rsetup@${release.version} already exists with the qualified bytes; publication skipped.\n`,
    );
    return;
  }
  const publish = process.env.PUBLISH_RELEASE === "true";
  const args = [
    "publish",
    identity.tarball,
    "--access",
    "public",
    "--tag",
    "latest",
    "--registry",
    "https://registry.npmjs.org",
    "--ignore-scripts",
  ];
  if (!publish) args.push("--dry-run");
  await new Promise((resolve, reject) => {
    const child = spawn("npm", args, { shell: false, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`npm publication exited ${code}.`)),
    );
  });
  if (!publish) {
    process.stdout.write("Dry-run complete; no package was published.\n");
    return;
  }
  const metadata = await waitForRegistryVersion({ version: release.version });
  verifyRegistryIdentity(metadata, identity, release.version);
  process.stdout.write(
    `Published rsetup@${release.version} with qualified integrity ${identity.integrity}.\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
