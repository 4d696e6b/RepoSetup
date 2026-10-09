import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateReleaseVersion } from "./release-context.mjs";

const defaultWorkspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coupledAlphaBranches = new Set([
  "codex/0.3.0-candidate-integration",
  "codex/release-0.3.0",
  "codex/release-0.4.0",
]);

export function requiresWebsiteBinding(version, refName = "") {
  validateReleaseVersion(version);
  const [major, minor] = version.split(".").map(Number);
  const websiteRelease = major > 0 || minor >= 3;
  return websiteRelease && (!version.includes("-") || coupledAlphaBranches.has(refName));
}

// identity must come from verifyArtifactIdentity, which checks the retained bytes,
// source and version. The website binds to those verified bytes, regardless of ref.
export async function verifyReleaseHandoff({
  identity,
  version,
  refName = "",
  workspaceRoot = defaultWorkspaceRoot,
}) {
  if (!requiresWebsiteBinding(version, refName)) return { required: false };
  let handoff;
  try {
    ({ handoff } = await import(
      pathToFileURL(path.join(workspaceRoot, "apps/website/src/handoff.ts")).href
    ));
  } catch (cause) {
    const error = new Error(
      "This release requires a reviewed website handoff; its pin is missing or invalid.",
      { cause },
    );
    error.code = "RELEASE_HANDOFF_REQUIRED";
    throw error;
  }
  if (
    identity?.record?.package !== "rsetup" ||
    identity.record.version !== version ||
    handoff?.version !== version ||
    typeof handoff.artifactSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(handoff.artifactSha256) ||
    identity.record.sha256 !== handoff.artifactSha256
  ) {
    const error = new Error(
      "The verified release artifact differs from the website's pinned package/version or SHA-256. Repin and qualify the handoff before publication.",
    );
    error.code = "RELEASE_HANDOFF_MISMATCH";
    throw error;
  }
  return { required: true, version, sha256: handoff.artifactSha256 };
}
