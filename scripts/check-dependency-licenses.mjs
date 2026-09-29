import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ALLOWED_LICENSES = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "ISC",
  "MIT",
  "MPL-2.0",
]);
const USAGE = "Usage: node scripts/check-dependency-licenses.mjs [--output <license-review.json>]";

function outputPath(args) {
  if (args.length === 0) {
    return undefined;
  }
  if (args.length === 2 && args[0] === "--output") {
    return path.resolve(args[1]);
  }
  throw new Error(USAGE);
}

function runPnpmLicenses() {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["licenses", "list", "--json"], {
      cwd: process.cwd(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
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
        resolve(stdout);
        return;
      }
      reject(new Error(`pnpm licenses list exited ${code ?? "without an exit code"}: ${stderr}`));
    });
  });
}

async function main() {
  const destination = outputPath(process.argv.slice(2));
  const parsed = JSON.parse(await runPnpmLicenses());
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("pnpm licenses list returned an unexpected JSON document.");
  }

  const licenses = Object.entries(parsed)
    .map(([license, packages]) => ({
      license,
      packageCount: Array.isArray(packages) ? packages.length : 0,
    }))
    .sort((left, right) => left.license.localeCompare(right.license));
  const unreviewed = licenses.filter(({ license }) => !ALLOWED_LICENSES.has(license));
  const result = {
    schemaVersion: 1,
    reviewedLicenses: licenses,
    unreviewedLicenses: unreviewed.map(({ license }) => license),
  };

  if (destination !== undefined) {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (unreviewed.length > 0) {
    throw new Error(
      `Unreviewed dependency licenses: ${unreviewed.map(({ license }) => license).join(", ")}`,
    );
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
