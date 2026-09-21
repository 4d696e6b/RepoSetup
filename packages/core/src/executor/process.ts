import { spawn } from "node:child_process";

import type { ProcessRunner } from "./types.js";

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
        const result = {
          exitCode: 1,
          stdout: "",
          stderr: error.message,
          ...(isNotFound(error) ? { notFound: true as const } : {}),
        };
        resolve(result);
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

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
