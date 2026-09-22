import { spawn } from "node:child_process";
import { access, appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";

import type { ExecutorFileSystem, ProcessRunner } from "@reposetup/core";

export function createDefaultExecutorFileSystem(): ExecutorFileSystem {
  return {
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
        const info = await stat(filePath);
        return info.isDirectory();
      } catch {
        return false;
      }
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

    async appendFile(filePath, content) {
      await appendFile(filePath, content, "utf8");
    },
  };
}

export function createDefaultProcessRunner(): ProcessRunner {
  return (request) =>
    new Promise((resolve) => {
      const child = spawn(request.command, [...request.args], {
        cwd: request.cwd,
        env: process.env,
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

      child.on("error", (error) => {
        resolve({
          exitCode: 1,
          stdout: "",
          stderr: error.message,
          ...(isNotFound(error) ? { notFound: true as const } : {}),
        });
      });

      child.on("close", (code) => {
        resolve({
          exitCode: code ?? 1,
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: Buffer.concat(stderrChunks).toString("utf8"),
        });
      });
    });
}

export function createDefaultCommandExists(
  runProcess: ProcessRunner,
): (command: string) => Promise<boolean> {
  return async (command) => {
    const result = await runProcess({
      command,
      args: ["--version"],
      cwd: process.cwd(),
    });
    return result.notFound !== true && result.exitCode === 0;
  };
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
