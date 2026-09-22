import { spawn } from "node:child_process";
import { access, appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";

import type { ExecutorFileSystem, ProcessRunner } from "@reposetup/core";

export const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60_000;
export const DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS = 30 * 60_000;
export const MAX_CAPTURED_OUTPUT_BYTES = 128 * 1024;

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
  return (request) => {
    if (request.signal?.aborted === true) {
      return Promise.resolve({ exitCode: 1, stdout: "", stderr: "", aborted: true });
    }

    return new Promise((resolve) => {
      const child = spawn(request.command, [...request.args], {
        cwd: request.cwd,
        env: process.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      let outputTruncated = false;
      let aborted = false;
      let timedOut = false;
      let settled = false;
      let timer: NodeJS.Timeout | undefined;

      const finish = (result: {
        exitCode: number;
        stdout: string;
        stderr: string;
        notFound?: boolean;
      }) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timer !== undefined) {
          clearTimeout(timer);
        }
        request.signal?.removeEventListener("abort", abort);
        resolve({
          ...result,
          ...(aborted ? { aborted: true } : {}),
          ...(timedOut ? { timedOut: true } : {}),
          ...(outputTruncated ? { outputTruncated: true } : {}),
        });
      };

      const terminate = (reason: "abort" | "timeout") => {
        if (reason === "abort") {
          aborted = true;
        } else {
          timedOut = true;
        }
        child.kill();
      };
      const abort = () => terminate("abort");

      child.stdout?.on("data", (chunk: Buffer) => {
        const appended = appendOutput(stdout, chunk);
        stdout = appended.output;
        outputTruncated ||= appended.truncated;
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        const appended = appendOutput(stderr, chunk);
        stderr = appended.output;
        outputTruncated ||= appended.truncated;
      });

      child.on("error", (error) => {
        finish({
          exitCode: 1,
          stdout: "",
          stderr: error.message,
          ...(isNotFound(error) ? { notFound: true as const } : {}),
        });
      });

      child.on("close", (code) => {
        finish({
          exitCode: code ?? 1,
          stdout: stdout.toString("utf8"),
          stderr: stderr.toString("utf8"),
        });
      });
      request.signal?.addEventListener("abort", abort, { once: true });
      if (request.timeoutMs !== undefined && request.timeoutMs > 0) {
        timer = setTimeout(() => terminate("timeout"), request.timeoutMs);
      }
    });
  };
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

function appendOutput(
  existing: Buffer<ArrayBufferLike>,
  chunk: Buffer<ArrayBufferLike>,
): { output: Buffer<ArrayBufferLike>; truncated: boolean } {
  const combined = Buffer.concat([existing, chunk]);
  if (combined.byteLength <= MAX_CAPTURED_OUTPUT_BYTES) {
    return { output: combined, truncated: false };
  }

  return {
    output: combined.subarray(combined.byteLength - MAX_CAPTURED_OUTPUT_BYTES),
    truncated: true,
  };
}
