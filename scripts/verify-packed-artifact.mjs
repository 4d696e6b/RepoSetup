import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const USAGE =
  "Usage: node scripts/verify-packed-artifact.mjs (--tarball <rsetup.tgz> --evidence <candidate-artifact.json> | --directory <candidate-artifact-directory>)";

function readArguments(args) {
  if (args.length === 2 && args[0] === "--directory") {
    return { directory: args[1] };
  }
  if (args.length === 4 && args[0] === "--tarball" && args[2] === "--evidence") {
    return { tarball: args[1], evidence: args[3] };
  }
  throw new Error(USAGE);
}

async function resolveArtifactPaths(args) {
  if ("tarball" in args) {
    return { tarball: args.tarball, evidence: args.evidence };
  }
  const directory = path.resolve(args.directory);
  const files = await readdir(directory);
  const tarballs = files.filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1 || !files.includes("candidate-artifact.json")) {
    throw new Error(
      "Candidate artifact directory must contain exactly one .tgz and candidate-artifact.json.",
    );
  }
  return {
    tarball: path.join(directory, tarballs[0]),
    evidence: path.join(directory, "candidate-artifact.json"),
  };
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited ${code ?? "without an exit code"}: ${stderr || stdout}`,
        ),
      );
    });
  });
}

async function main() {
  const paths = await resolveArtifactPaths(readArguments(process.argv.slice(2)));
  const tarballPath = path.resolve(paths.tarball);
  const evidencePath = path.resolve(paths.evidence);
  const tarballStats = await stat(tarballPath);
  if (!tarballStats.isFile() || tarballStats.size === 0) {
    throw new Error("--tarball must be a non-empty regular file.");
  }

  const record = JSON.parse(await readFile(evidencePath, "utf8"));
  if (
    record?.schemaVersion !== 1 ||
    record.package !== "rsetup" ||
    typeof record.version !== "string" ||
    record.artifact !== path.basename(tarballPath) ||
    typeof record.sha256 !== "string" ||
    !SHA256_PATTERN.test(record.sha256)
  ) {
    throw new Error("Evidence does not describe this rsetup artifact.");
  }
  const actualSha256 = createHash("sha256")
    .update(await readFile(tarballPath))
    .digest("hex");
  if (actualSha256 !== record.sha256) {
    throw new Error("Artifact SHA-256 does not match its evidence record.");
  }

  const installDirectory = await mkdtemp(path.join(os.tmpdir(), "reposetup-candidate-install-"));
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    await run(npm, ["init", "-y"], installDirectory);
    await run(npm, ["install", tarballPath], installDirectory);
    const installed = JSON.parse(
      await readFile(path.join(installDirectory, "node_modules", "rsetup", "package.json"), "utf8"),
    );
    if (installed.name !== record.package || installed.version !== record.version) {
      throw new Error("Installed manifest does not match candidate evidence.");
    }

    for (const alias of ["rsetup", "reposetup"]) {
      const version = await run(npm, ["exec", "--", alias, "--version"], installDirectory);
      if (version.stdout.trim() !== record.version) {
        throw new Error(`${alias} did not report the candidate version.`);
      }
      const help = await run(npm, ["exec", "--", alias, "--help"], installDirectory);
      if (!help.stdout.includes("Usage: reposetup")) {
        throw new Error(`${alias} did not render CLI help.`);
      }
    }
  } finally {
    await rm(installDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
