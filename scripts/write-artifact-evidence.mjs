import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SOURCE_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const USAGE =
  "Usage: node scripts/write-artifact-evidence.mjs --tarball <rsetup.tgz> --source-sha <40-char SHA> --output <artifact.json>";

function readArguments(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--tarball", "--source-sha", "--output"].includes(flag) || value === undefined) {
      throw new Error(USAGE);
    }
    if (values.has(flag)) {
      throw new Error(`Duplicate argument: ${flag}`);
    }
    values.set(flag, value);
  }

  const tarball = values.get("--tarball");
  const sourceSha = values.get("--source-sha");
  const output = values.get("--output");
  if (
    tarball === undefined ||
    sourceSha === undefined ||
    output === undefined ||
    values.size !== 3
  ) {
    throw new Error(USAGE);
  }
  if (!SOURCE_SHA_PATTERN.test(sourceSha)) {
    throw new Error("--source-sha must be a 40-character hexadecimal Git SHA.");
  }
  return { tarball, sourceSha: sourceSha.toLowerCase(), output };
}

async function main() {
  const { tarball, sourceSha, output } = readArguments(process.argv.slice(2));
  const tarballPath = path.resolve(tarball);
  const outputPath = path.resolve(output);
  if (path.extname(tarballPath) !== ".tgz") {
    throw new Error("--tarball must name a .tgz file.");
  }

  const tarballStats = await stat(tarballPath);
  if (!tarballStats.isFile() || tarballStats.size === 0) {
    throw new Error("--tarball must be a non-empty regular file.");
  }

  const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const packageManifest = JSON.parse(
    await readFile(path.join(workspaceRoot, "packages", "cli", "package.json"), "utf8"),
  );
  if (packageManifest.name !== "rsetup" || typeof packageManifest.version !== "string") {
    throw new Error("packages/cli/package.json does not describe the public rsetup package.");
  }

  const sha256 = createHash("sha256")
    .update(await readFile(tarballPath))
    .digest("hex");
  const evidence = {
    schemaVersion: 1,
    package: packageManifest.name,
    version: packageManifest.version,
    sourceSha,
    artifact: path.basename(tarballPath),
    bytes: tarballStats.size,
    sha256,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
