import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const monorepoBin = path.join(repoRoot, "packages", "cli", "dist", "bin.js");

export interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runNodeCli(
  bin: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<CliRunResult> {
  return runProcess(process.execPath, [bin, ...args], options);
}

export async function runProcess(
  command: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<CliRunResult> {
  const launch = windowsLaunch(command, args);
  return new Promise((resolve, reject) => {
    const child = spawn(launch.command, launch.args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

function windowsLaunch(
  command: string,
  args: readonly string[],
): {
  command: string;
  args: readonly string[];
} {
  if (process.platform !== "win32") {
    return { command, args };
  }

  const invocation = [command, ...args].map(quoteWindowsToken).join(" ");
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/c", invocation],
  };
}

function quoteWindowsToken(token: string): string {
  if (token.includes("\0") || /[\r\n"&|<>^%!]/.test(token)) {
    throw new Error(`Unsafe Windows test command token: ${token}`);
  }
  return `"${token}"`;
}

export async function createTempWorkspace(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function snapshotTree(root: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(root, full).split(path.sep).join("/");
      if (entry.isDirectory()) {
        snapshot[`${rel}/`] = "dir";
        await walk(full);
      } else {
        snapshot[rel] = await readFile(full, "utf8");
      }
    }
  }

  await walk(root);
  return snapshot;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function cleanupWorkspace(dir: string, keep: boolean): Promise<void> {
  if (keep) {
    return;
  }
  await rm(dir, { recursive: true, force: true });
}

export function keepOnFailure(): boolean {
  return process.env.REPOSETUP_KEEP_E2E === "1";
}

export function fixturePath(name: string): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", name);
}

export function cliPackageVersion(): string {
  const pkg = JSON.parse(
    readFileSync(path.join(repoRoot, "packages", "cli", "package.json"), "utf8"),
  ) as { version: string };
  return pkg.version;
}
