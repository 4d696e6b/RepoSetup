import { execFile } from "node:child_process";
import { lstat, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { validateReleaseVersion } from "./release-context.mjs";

const executeFile = promisify(execFile);
const defaultWorkspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseTargets = {
  "0.3.0": "codex/0.3.0-candidate-integration",
  "0.4.0": "codex/0.4.0-task-compiler",
};
const packageDirectories = ["cli", "core", "integrations", "registry"];

function preparationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function parsePreparationArguments(arguments_) {
  let version;
  let write = false;
  for (let index = 0; index < arguments_.length; index++) {
    const argument = arguments_[index];
    if (argument === "--version" && version === undefined) {
      version = arguments_[++index];
    } else if (argument === "--write" && !write) {
      write = true;
    } else {
      throw preparationError("RELEASE_PREPARATION_ARGUMENT", `Unexpected argument: ${argument}`);
    }
  }
  validateReleaseVersion(version, { stableOnly: true });
  if (!Object.hasOwn(releaseTargets, version)) {
    throw preparationError(
      "RELEASE_PREPARATION_TARGET",
      "Prepared release targets are 0.3.0 and 0.4.0.",
    );
  }
  return { version, write };
}

async function git(workspaceRoot, arguments_) {
  return (await executeFile("git", arguments_, { cwd: workspaceRoot, shell: false })).stdout.trim();
}

async function assertWriteSource(workspaceRoot, version) {
  if (
    (await realpath(await git(workspaceRoot, ["rev-parse", "--show-toplevel"]))) !== workspaceRoot
  ) {
    throw preparationError("RELEASE_PREPARATION_ROOT", "Run from the release workspace root.");
  }
  if ((await git(workspaceRoot, ["branch", "--show-current"])) !== `codex/release-${version}`) {
    throw preparationError(
      "RELEASE_PREPARATION_BRANCH",
      `Finalize only on codex/release-${version}; implementation branches keep their candidate versions.`,
    );
  }
  if (await git(workspaceRoot, ["status", "--porcelain", "--untracked-files=all"])) {
    throw preparationError(
      "RELEASE_PREPARATION_DIRTY",
      "Commit or preserve outstanding changes before finalization.",
    );
  }
  for (const reference of [`refs/heads/${releaseTargets[version]}`, "refs/remotes/origin/main"]) {
    try {
      await git(workspaceRoot, ["merge-base", "--is-ancestor", reference, "HEAD"]);
    } catch {
      throw preparationError(
        "RELEASE_PREPARATION_BASELINE",
        `Merge the current ${reference} before finalization. Fetch origin first to refresh main.`,
      );
    }
  }
}

async function readManifests(workspaceRoot, version) {
  const files = [];
  for (const directory of packageDirectories) {
    const relativePath = `packages/${directory}/package.json`;
    const filePath = path.join(workspaceRoot, relativePath);
    for (const component of ["packages", `packages/${directory}`, relativePath]) {
      const info = await lstat(path.join(workspaceRoot, component));
      if (info.isSymbolicLink() || (component !== relativePath && !info.isDirectory())) {
        throw preparationError(
          "RELEASE_PREPARATION_PATH",
          `Refusing linked or invalid path: ${component}`,
        );
      }
    }
    const info = await lstat(filePath);
    if (!info.isFile() || info.size > 1024 * 1024) {
      throw preparationError(
        "RELEASE_PREPARATION_PATH",
        `Expected a bounded regular manifest: ${relativePath}`,
      );
    }
    const before = await readFile(filePath, "utf8");
    const manifest = JSON.parse(before);
    const expectedName = directory === "cli" ? "rsetup" : `@reposetup/${directory}`;
    if (
      manifest.name !== expectedName ||
      (directory === "cli" ? manifest.private === true : manifest.private !== true)
    ) {
      throw preparationError(
        "RELEASE_PREPARATION_PACKAGE",
        `Invalid public/private identity: ${relativePath}`,
      );
    }
    validateReleaseVersion(manifest.version);
    files.push({
      filePath,
      relativePath,
      before,
      after: `${JSON.stringify({ ...manifest, version }, null, 2)}\n`,
      from: manifest.version,
      mode: info.mode,
    });
  }
  return files;
}

// Maintainer tooling only: no install plan, network calls, tags, commits or publication.
export async function prepareReleaseVersion({
  workspaceRoot = defaultWorkspaceRoot,
  version,
  write = false,
}) {
  parsePreparationArguments(["--version", version, ...(write ? ["--write"] : [])]);
  const root = await realpath(workspaceRoot);
  const files = await readManifests(root, version);
  const changes = files.filter((file) => file.from !== version);
  if (write) {
    await assertWriteSource(root, version);
    // Recheck all inputs before the first mutation. An interrupted write leaves a
    // dirty tree and mismatched versions, both of which block stable publication.
    for (const file of files) {
      if (
        (await readFile(file.filePath, "utf8")) !== file.before ||
        (await lstat(file.filePath)).isSymbolicLink()
      ) {
        throw preparationError(
          "RELEASE_PREPARATION_CHANGED",
          `Manifest changed during preparation: ${file.relativePath}`,
        );
      }
    }
    for (const file of changes) {
      const temporaryPath = `${file.filePath}.release-${process.pid}.tmp`;
      let createdTemporary = false;
      try {
        await writeFile(temporaryPath, file.after, { flag: "wx", mode: file.mode });
        createdTemporary = true;
        await rename(temporaryPath, file.filePath);
      } finally {
        if (createdTemporary) {
          await unlink(temporaryPath).catch((error) => {
            if (error.code !== "ENOENT") throw error;
          });
        }
      }
    }
  }
  return {
    targetVersion: version,
    releaseBranch: `codex/release-${version}`,
    implementationBranch: releaseTargets[version],
    written: write,
    changes: changes.map((file) => ({ path: file.relativePath, from: file.from, to: version })),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).length === 1 && process.argv[2] === "--help") {
      process.stdout.write(
        "Usage: pnpm release:prepare --version <0.3.0|0.4.0> [--write]\nDefault: preview only. --write requires a clean matching release branch with current implementation and origin/main merged.\n",
      );
    } else {
      process.stdout.write(
        `${JSON.stringify(await prepareReleaseVersion(parsePreparationArguments(process.argv.slice(2))), null, 2)}\n`,
      );
    }
  } catch (error) {
    process.stderr.write(
      `Error [${error.code ?? "RELEASE_PREPARATION_FAILED"}]: ${error.message}\n`,
    );
    process.exitCode = 1;
  }
}
