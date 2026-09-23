import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  access,
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { RepoSetupConfig } from "../config/types.js";
import { planLockedReproduction, type RecipeRecord } from "../planning/recipe.js";

import { executeInstallation as executeCoreInstallation } from "./execute.js";
import type { ExecuteOptions, ExecutorFileSystem, ProcessRunner } from "./types.js";

const tempDirs: string[] = [];
const userNpmrc = "save-exact=true\n";

const testFileSystem: ExecutorFileSystem = {
  async exists(filePath) {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  },
  async isDirectory(filePath) {
    try {
      return (await stat(filePath)).isDirectory();
    } catch {
      return false;
    }
  },
  async canWrite(filePath) {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  },
  async realpath(filePath) {
    return realpath(filePath);
  },
  async mkdir(filePath) {
    await mkdir(filePath, { recursive: true });
  },
  async readFile(filePath) {
    return readFile(filePath, "utf8");
  },
  async writeFile(filePath, content) {
    await writeFile(filePath, content, "utf8");
  },
  async writeFileAtomic(filePath, content) {
    const temporaryPath = `${filePath}.reposetup-test-tmp`;
    await writeFile(temporaryPath, content, "utf8");
    await rename(temporaryPath, filePath);
  },
  async writeFileExclusive(filePath, content) {
    await writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
  },
  async appendFile(filePath, content) {
    await appendFile(filePath, content, "utf8");
  },
};

function runProcess(cacheDir: string): ProcessRunner {
  return (request) =>
    new Promise((resolve, reject) => {
      const child = spawn(nodePackageManagerCommand(request.command), [...request.args], {
        cwd: request.cwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: npmEnv(cacheDir),
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.on("error", reject);
      child.on("close", (code) => {
        resolve({
          exitCode: code ?? 1,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        });
      });
    });
}

function executeInstallation(
  operations: Parameters<typeof executeCoreInstallation>[0],
  options: Omit<ExecuteOptions, "fs" | "runProcess">,
  cacheDir: string,
) {
  return executeCoreInstallation(operations, {
    ...options,
    fs: testFileSystem,
    runProcess: runProcess(cacheDir),
  });
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("locked npm reproduction", () => {
  it("repeats npm ci without changing the lockfile, npmrc, or installed version", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-locked-"));
    tempDirs.push(root);
    const appDir = path.join(root, "app");
    const cacheDir = path.join(root, "npm-cache");
    await mkdir(appDir);
    await mkdir(path.join(root, "local-pin"));
    await writeFile(
      path.join(root, "local-pin", "package.json"),
      `${JSON.stringify({ name: "local-pin", version: "1.0.0", private: true }, null, 2)}\n`,
    );
    await writeFile(
      path.join(appDir, "package.json"),
      `${JSON.stringify(
        {
          name: "lock-demo",
          private: true,
          dependencies: { "local-pin": "file:../local-pin" },
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(path.join(appDir, ".npmrc"), userNpmrc);

    const setup = await runNpm(appDir, cacheDir, ["install"]);
    expect(setup.exitCode, `${setup.stderr}\n${setup.stdout}`).toBe(0);
    const lockBefore = await readFile(path.join(appDir, "package-lock.json"));
    const installed = JSON.parse(
      await readFile(path.join(appDir, "node_modules", "local-pin", "package.json"), "utf8"),
    ) as { version: string };
    expect(installed.version).toBe("1.0.0");

    const operation = lockedNpmInstall();
    const first = await executeInstallation([operation], { rootDir: appDir }, cacheDir);
    expect(first.ok, JSON.stringify(first)).toBe(true);
    const second = await executeInstallation([operation], { rootDir: appDir }, cacheDir);
    expect(second.ok, JSON.stringify(second)).toBe(true);

    const lockAfter = await readFile(path.join(appDir, "package-lock.json"));
    expect(sha256(lockAfter)).toBe(sha256(lockBefore));
    expect(await readFile(path.join(appDir, ".npmrc"), "utf8")).toBe(userNpmrc);
    const repeated = JSON.parse(
      await readFile(path.join(appDir, "node_modules", "local-pin", "package.json"), "utf8"),
    ) as { version: string };
    expect(repeated.version).toBe("1.0.0");

    const manifest = JSON.parse(await readFile(path.join(appDir, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    manifest.dependencies["local-pin"] = "9.9.9";
    await writeFile(path.join(appDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const drifted = await executeInstallation([operation], { rootDir: appDir }, cacheDir);
    expect(drifted.ok).toBe(false);
    if (!drifted.ok) {
      expect(drifted.error.code).toBe("COMMAND_FAILED");
    }
    expect(sha256(await readFile(path.join(appDir, "package-lock.json")))).toBe(sha256(lockBefore));
    expect(await readFile(path.join(appDir, ".npmrc"), "utf8")).toBe(userNpmrc);
  });
});

function lockedNpmInstall() {
  const config: RepoSetupConfig = {
    schemaVersion: 1,
    project: { name: "lock-demo" },
    runtime: { id: "node" },
    packageManager: "npm",
    framework: { id: "express" },
    integrations: [],
  };
  const record: RecipeRecord = {
    recipeVersion: 1,
    registryRevision: "test",
    config,
    lockfiles: ["package-lock.json"],
  };
  const planned = planLockedReproduction(record);
  if (!planned.ok) {
    throw new Error(planned.error.message);
  }
  return planned.operation;
}

function nodePackageManagerCommand(command: string): string {
  return process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
}

function npmEnv(cacheDir: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    npm_config_cache: cacheDir,
    npm_config_fund: "false",
    npm_config_audit: "false",
    npm_config_update_notifier: "false",
    npm_config_progress: "false",
    npm_config_fetch_retries: "0",
    npm_config_fetch_retry_mintimeout: "1",
    npm_config_fetch_retry_maxtimeout: "1",
  };
}

function runNpm(
  cwd: string,
  cacheDir: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(nodePackageManagerCommand("npm"), args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: npmEnv(cacheDir),
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
