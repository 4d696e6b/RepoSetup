import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const releaseRepository = "4d696e6b/RepoSetup";
const workspacePackages = ["core", "integrations", "registry"];
const versionPattern =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const defaultWorkspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function releaseError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function validateReleaseVersion(version, { stableOnly = false } = {}) {
  const match = typeof version === "string" ? version.match(versionPattern) : undefined;
  if (
    !match ||
    match[0] !== version ||
    match[4]?.split(".").some((part) => /^[0-9]+$/.test(part) && part.length > 1 && part[0] === "0")
  ) {
    throw releaseError(
      "RELEASE_INVALID_VERSION",
      "Release version must be a valid version without build metadata.",
    );
  }
  if (stableOnly && match[4] !== undefined) {
    throw releaseError(
      "RELEASE_UNSTABLE_VERSION",
      "Stable publication requires a version without a prerelease suffix.",
    );
  }
  return version;
}

export async function readReleaseContext({
  workspaceRoot = defaultWorkspaceRoot,
  stableOnly = false,
} = {}) {
  async function manifest(packageDirectory) {
    return JSON.parse(
      await readFile(
        path.join(workspaceRoot, "packages", packageDirectory, "package.json"),
        "utf8",
      ),
    );
  }
  const cli = await manifest("cli");
  if (cli?.name !== "rsetup" || cli.private === true) {
    throw releaseError(
      "RELEASE_INVALID_PACKAGE",
      "The public CLI manifest must describe the public rsetup package.",
    );
  }
  const version = validateReleaseVersion(cli.version, { stableOnly });
  const libraries = await Promise.all(workspacePackages.map((name) => manifest(name)));
  for (const [index, library] of libraries.entries()) {
    const name = workspacePackages[index];
    if (library?.name !== `@reposetup/${name}` || library.private !== true) {
      throw releaseError(
        "RELEASE_PRIVATE_WORKSPACE_REQUIRED",
        `Workspace library ${name} must remain private.`,
      );
    }
    // Development candidates may retain older private-library versions. Finalization
    // must put all four workspace manifests in lockstep before stable publication.
    if (stableOnly && library.version !== version) {
      throw releaseError(
        "RELEASE_WORKSPACE_VERSION_MISMATCH",
        `Finalize workspace library ${name} to ${version} before stable publication.`,
      );
    }
  }
  return { packageName: "rsetup", version, tag: `v${version}` };
}

export function assertStableReleaseSource(context, environment) {
  const version = validateReleaseVersion(context.version, { stableOnly: true });
  if (
    environment.GITHUB_REPOSITORY !== releaseRepository ||
    environment.GITHUB_REF !== `refs/tags/v${version}` ||
    environment.GITHUB_SHA?.length !== 40 ||
    !/^[0-9a-f]{40}$/.test(environment.GITHUB_SHA ?? "")
  ) {
    throw releaseError(
      "RELEASE_SOURCE_MISMATCH",
      `Stable publication requires the exact v${version} tag source in the official repository.`,
    );
  }
}
