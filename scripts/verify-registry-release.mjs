import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { verifyArtifactIdentity } from "./artifact-identity.mjs";
import { registryVersion, verifyRegistryIdentity } from "./publish-qualified-artifact.mjs";

function run(command, args, cwd) {
  const windowsNpm = process.platform === "win32" && command === "npm";
  return new Promise((resolve, reject) => {
    const child = spawn(
      windowsNpm ? (process.env.ComSpec ?? "cmd.exe") : command,
      windowsNpm ? ["/d", "/v:off", "/c", "npm.cmd", ...args] : args,
      { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(stdout)
        : reject(new Error(`${command} exited ${code}: ${stderr || stdout}`)),
    );
  });
}

export async function verifyDelivery(tarball) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-registry-release-"));
  try {
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ name: "registry-acceptance", private: true }),
    );
    if (tarball !== undefined) await copyFile(tarball, path.join(directory, "package.tgz"));
    await run(
      "npm",
      [
        "install",
        tarball === undefined ? "rsetup@0.2.2" : "./package.tgz",
        "--registry",
        "https://registry.npmjs.org",
        "--no-audit",
        "--no-fund",
      ],
      directory,
    );
    const manifest = JSON.parse(
      await readFile(path.join(directory, "node_modules/rsetup/package.json"), "utf8"),
    );
    if (manifest.name !== "rsetup" || manifest.version !== "0.2.2")
      throw new Error("Installed version differs from release.");
    for (const alias of ["rsetup", "reposetup"]) {
      if ((await run("npm", ["exec", "--", alias, "--version"], directory)).trim() !== "0.2.2")
        throw new Error(`${alias} version is incorrect.`);
      if (
        !(await run("npm", ["exec", "--", alias, "--help"], directory)).includes("Usage: reposetup")
      )
        throw new Error(`${alias} help failed.`);
    }
    const config = {
      schemaVersion: 1,
      project: { name: "delivery-app" },
      runtime: { id: "node" },
      packageManager: "npm",
      framework: { id: "express", options: { typescript: true } },
      integrations: [{ id: "vitest" }],
    };
    await writeFile(path.join(directory, "delivery.json"), JSON.stringify(config));
    const project = path.join(directory, "delivery-app");
    await mkdir(project);
    const bin = path.join(directory, "node_modules/rsetup/dist/bin.js");
    const configPath = path.join(directory, "delivery.json");
    const dryRun = await run(
      process.execPath,
      [bin, "create", "--config", configPath, "--dry-run"],
      project,
    );
    if (
      !dryRun.includes("No files or commands were executed.") ||
      (await readdir(project)).length !== 0
    ) {
      throw new Error("Published CLI dry-run mutated the project or did not finish.");
    }
    await run(process.execPath, [bin, "create", "--config", configPath, "--yes"], project);
    await run("npm", ["run", "build"], project);
    await run("npm", ["test", "--", "--run"], project);
    process.stdout.write(
      `Registry delivery accepted on ${process.platform}/${process.arch}: aliases, dry-run, Express build and HTTP-response test.\n`,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function main() {
  const identity = await verifyArtifactIdentity("candidate", {
    version: "0.2.2",
    sourceSha: process.env.GITHUB_SHA,
  });
  const metadata = await registryVersion();
  if (!metadata) throw new Error("rsetup@0.2.2 is not published.");
  verifyRegistryIdentity(metadata, identity);
  const latestResponse = await globalThis.fetch("https://registry.npmjs.org/rsetup/latest", {
    signal: globalThis.AbortSignal.timeout(30_000),
  });
  if (!latestResponse.ok)
    throw new Error(`Stable dist-tag lookup failed (${latestResponse.status}).`);
  verifyRegistryIdentity(await latestResponse.json(), identity);
  await verifyDelivery();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
