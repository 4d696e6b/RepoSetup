import { createHash } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cliPackageVersion, repoRoot, runProcess, writeJson } from "./harness.js";

export interface ArtifactIdentity {
  schemaVersion: 1;
  package: "rsetup";
  version: string;
  sourceSha: string;
  artifact: string;
  bytes: number;
  sha256: string;
}
export const sha256 = (bytes: string | Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

export function planFingerprint(plan: unknown): string {
  const sorted = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sorted);
    if (typeof value !== "object" || value === null) return value;
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, sorted(child)]),
    );
  };
  return sha256(JSON.stringify(sorted(plan)));
}

export function verifyArtifactIdentity(
  record: unknown,
  bytes: Buffer,
  filename: string,
  sourceSha: string,
): ArtifactIdentity {
  if (typeof record !== "object" || record === null) throw new Error("Missing artifact identity");
  const value = record as Partial<ArtifactIdentity>;
  if (
    value.schemaVersion !== 1 ||
    value.package !== "rsetup" ||
    value.version !== cliPackageVersion() ||
    value.artifact !== filename ||
    value.sourceSha !== sourceSha ||
    !/^[a-f0-9]{40}$/.test(value.sourceSha) ||
    value.bytes !== bytes.length ||
    bytes.length === 0 ||
    value.sha256 !== sha256(bytes)
  )
    throw new Error(
      "Artifact bytes, version or source identity do not match the acceptance fixture",
    );
  // Emit only identity fields, never arbitrary fields from an external evidence file.
  return {
    schemaVersion: 1,
    package: "rsetup",
    version: value.version,
    sourceSha,
    artifact: filename,
    bytes: bytes.length,
    sha256: value.sha256,
  };
}

async function successful(command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv) {
  const result = await runProcess(command, args, { cwd, ...(env === undefined ? {} : { env }) });
  if (result.exitCode !== 0)
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

export async function prepareSelectionArtifact(root: string) {
  const sourceSha = await successful("git", ["rev-parse", "HEAD"], repoRoot);
  const sourceDirty =
    (await successful("git", ["status", "--porcelain", "--untracked-files=all"], repoRoot)).length >
    0;
  const artifactDirectory =
    process.env.REPOSETUP_SELECTION_ARTIFACT_DIR ?? path.join(root, "artifact");
  const externalArtifact = process.env.REPOSETUP_SELECTION_ARTIFACT_DIR !== undefined;
  if (externalArtifact && sourceDirty)
    throw new Error(
      "External artifact acceptance requires a clean checkout of its exact source SHA",
    );
  if (!externalArtifact) {
    await mkdir(artifactDirectory);
    await successful(
      "pnpm",
      ["--filter", "rsetup", "pack", "--pack-destination", artifactDirectory],
      repoRoot,
    );
    await successful(
      process.execPath,
      [
        path.join(repoRoot, "scripts/write-artifact-evidence.mjs"),
        "--tarball",
        path.join(artifactDirectory, `rsetup-${cliPackageVersion()}.tgz`),
        "--source-sha",
        sourceSha,
        "--output",
        path.join(artifactDirectory, "candidate-artifact.json"),
      ],
      repoRoot,
    );
  }
  const tarballs = (await readdir(artifactDirectory)).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1)
    throw new Error("Selection acceptance requires exactly one identified tarball");
  const filename = tarballs[0]!;
  const tarball = path.join(artifactDirectory, filename);
  const identity = verifyArtifactIdentity(
    JSON.parse(await readFile(path.join(artifactDirectory, "candidate-artifact.json"), "utf8")),
    await readFile(tarball),
    filename,
    sourceSha,
  );
  const installDir = path.join(root, "installed-cli");
  await writeJson(path.join(installDir, "package.json"), {
    name: "selection-acceptance",
    version: "0.0.0",
    private: true,
  });
  // This installs only the CLI under test. The 45 project journeys below are dry-runs.
  await successful(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
    installDir,
    {
      ...process.env,
      npm_config_cache: path.join(root, "npm-cache"),
    },
  );
  const installed = JSON.parse(
    await readFile(path.join(installDir, "node_modules/rsetup/package.json"), "utf8"),
  );
  if (
    installed.name !== identity.package ||
    installed.version !== identity.version ||
    installed.bin?.rsetup !== "./dist/bin.js" ||
    installed.bin?.reposetup !== "./dist/bin.js"
  ) {
    throw new Error("Installed CLI manifest/aliases do not match the artifact identity");
  }
  return {
    bin: path.join(installDir, "node_modules/rsetup/dist/bin.js"),
    installDir,
    identity,
    sourceDirty,
    externalArtifact,
    installedLockSha256: sha256(await readFile(path.join(installDir, "package-lock.json"))),
    tools: {
      node: process.version,
      npm: await successful("npm", ["--version"], repoRoot),
      pnpm: await successful("pnpm", ["--version"], repoRoot),
    },
  };
}
