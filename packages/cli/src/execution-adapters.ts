import { spawn } from "node:child_process";
import { constants, existsSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import {
  access,
  appendFile,
  mkdir,
  readFile,
  realpath,
  rm,
  rename,
  stat,
  statfs,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  redactProcessOutput,
  type ExecutionLock,
  type ExecutionJournal,
  type ExecutableResolver,
  type ExecutorFileSystem,
  type ProcessRunner,
} from "@reposetup/core";

export const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60_000;
export const DEFAULT_LONG_RUNNING_COMMAND_TIMEOUT_MS = 30 * 60_000;
export const MAX_CAPTURED_OUTPUT_BYTES = 128 * 1024;
export const DEFAULT_MINIMUM_FREE_DISK_BYTES = 512 * 1024 * 1024;

export function createDefaultExecutionLock(): ExecutionLock {
  return {
    async acquire(rootDir) {
      const lockRoot = path.join(os.tmpdir(), "reposetup-locks");
      const lockId = createHash("sha256").update(rootDir).digest("hex");
      const lockPath = path.join(lockRoot, lockId);

      try {
        await mkdir(lockRoot, { recursive: true, mode: 0o700 });
        await mkdir(lockPath, { mode: 0o700 });
      } catch (error) {
        return {
          ok: false,
          reason: isAlreadyExists(error) ? "already_locked" : "unavailable",
        };
      }

      return {
        ok: true,
        handle: {
          async release() {
            await rm(lockPath, { recursive: true, force: true });
          },
        },
      };
    },
  };
}

export function createDefaultExecutionJournal(
  options: { directory?: string } = {},
): ExecutionJournal {
  let journalPath: string | undefined;
  const directory = options.directory ?? path.join(os.tmpdir(), "reposetup-journals");

  return {
    async start(rootDir) {
      const rootHash = createHash("sha256").update(rootDir).digest("hex");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      journalPath = path.join(directory, `${rootHash}-${randomUUID()}.jsonl`);
      await writeFile(
        journalPath,
        `${JSON.stringify({ version: 1, rootHash, status: "started" })}\n`,
        { encoding: "utf8", flag: "wx", mode: 0o600 },
      );
    },

    async record(entry) {
      if (journalPath !== undefined) {
        await appendFile(journalPath, `${JSON.stringify(entry)}\n`, "utf8");
      }
    },

    async finish(outcome) {
      if (journalPath === undefined) {
        return;
      }
      if (outcome === "succeeded") {
        await unlink(journalPath);
      } else {
        await appendFile(journalPath, `${JSON.stringify({ status: outcome })}\n`, "utf8");
      }
      journalPath = undefined;
    },
  };
}

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

    async canWrite(filePath) {
      try {
        await access(filePath, constants.W_OK);
        return true;
      } catch {
        return false;
      }
    },

    async availableDiskBytes(filePath) {
      const info = await statfs(filePath, { bigint: true });
      return Number(info.bsize * info.bavail);
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
      const temporaryPath = path.join(
        path.dirname(filePath),
        `.${path.basename(filePath)}.reposetup-${randomUUID()}.tmp`,
      );

      try {
        await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
        await rename(temporaryPath, filePath);
      } catch (error) {
        await unlink(temporaryPath).catch(() => undefined);
        throw error;
      }
    },

    async writeFileExclusive(filePath, content) {
      await writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
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

    const launch =
      process.platform === "win32"
        ? resolveWindowsLaunch(request.command, request.args, process.env, existsSync)
        : { command: request.command, args: request.args };
    if ("error" in launch) {
      return Promise.resolve({ exitCode: 1, stdout: "", stderr: launch.error });
    }

    return new Promise((resolve) => {
      const child = spawn(launch.command, [...launch.args], {
        cwd: request.cwd,
        env: process.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        detached: process.platform !== "win32",
      });

      let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      let outputTruncated = false;
      let aborted = false;
      let timedOut = false;
      let settled = false;
      let timer: NodeJS.Timeout | undefined;
      const stdoutOutput = createOutputEmitter("stdout", request.onOutput);
      const stderrOutput = createOutputEmitter("stderr", request.onOutput);

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
        stdoutOutput.flush();
        stderrOutput.flush();
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
        terminateProcessTree(child);
      };
      const abort = () => terminate("abort");

      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => {
        stdoutOutput.write(chunk);
        const appended = appendOutput(stdout, chunk);
        stdout = appended.output;
        outputTruncated ||= appended.truncated;
      });
      child.stderr?.on("data", (chunk: string) => {
        stderrOutput.write(chunk);
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

interface WindowsLaunch {
  command: string;
  args: readonly string[];
}

interface WindowsLaunchFailure {
  error: string;
}

/**
 * Resolves known Windows executable layouts without setting Node's `shell` option.
 * `.cmd` and `.bat` shims are explicitly passed to cmd.exe only after every token
 * has been constrained to characters that cannot alter the command grammar.
 */
export function resolveWindowsLaunch(
  command: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
  exists: (filePath: string) => boolean,
): WindowsLaunch | WindowsLaunchFailure {
  if (!isSimpleExecutableName(command)) {
    return { command, args };
  }

  const resolved = findWindowsExecutable(command, environment, exists);
  if (resolved === undefined || isNativeWindowsExecutable(resolved)) {
    return { command: resolved ?? command, args };
  }

  const invocation = serializeWindowsShimInvocation(resolved, args);
  if (invocation === undefined) {
    return {
      error:
        `Refusing to execute the Windows command shim for "${command}" because its path or arguments contain shell metacharacters. ` +
        "Use a native executable or remove shell metacharacters from the command arguments.",
    };
  }

  return {
    command: environment.ComSpec ?? "cmd.exe",
    args: ["/d", "/c", invocation],
  };
}

function findWindowsExecutable(
  command: string,
  environment: NodeJS.ProcessEnv,
  exists: (filePath: string) => boolean,
): string | undefined {
  const extensions = (environment.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((extension) => extension.toLowerCase())
    .filter((extension) => [".com", ".exe", ".bat", ".cmd"].includes(extension));
  const directories = (environment.PATH ?? "").split(";").filter(Boolean);

  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path.win32.join(directory, `${command}${extension}`);
      if (exists(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function isNativeWindowsExecutable(filePath: string): boolean {
  const extension = path.win32.extname(filePath).toLowerCase();
  return extension === ".exe" || extension === ".com";
}

function serializeWindowsShimInvocation(
  filePath: string,
  args: readonly string[],
): string | undefined {
  const tokens = [filePath, ...args];
  if (tokens.some((token) => !isSafeWindowsShimToken(token))) {
    return undefined;
  }
  return tokens.map((token) => `"${token}"`).join(" ");
}

function isSimpleExecutableName(value: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(value);
}

function isSafeWindowsShimToken(value: string): boolean {
  return !value.includes("\0") && !/[\r\n"&|<>^%!]/.test(value);
}

function terminateProcessTree(child: ReturnType<typeof spawn>): void {
  if (process.platform !== "win32" && child.pid !== undefined) {
    try {
      process.kill(-child.pid, "SIGTERM");
      return;
    } catch {
      // The process may have exited before its process group was signalled.
    }
  }

  child.kill("SIGTERM");
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

export function createDefaultExecutableResolver(runProcess: ProcessRunner): ExecutableResolver {
  let python: string | undefined;
  let attemptedPython = false;

  return async (command) => {
    if (command !== "python") {
      return command;
    }
    if (attemptedPython) {
      return python;
    }

    attemptedPython = true;
    for (const candidate of pythonCandidates()) {
      const result = await runProcess({
        command: candidate,
        args: ["--version"],
        cwd: process.cwd(),
      });
      if (result.notFound !== true && result.exitCode === 0) {
        python = candidate;
        return python;
      }
    }

    return undefined;
  };
}

function pythonCandidates(): readonly string[] {
  return process.platform === "win32" ? ["py", "python", "python3"] : ["python3", "python"];
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function appendOutput(
  existing: Buffer<ArrayBufferLike>,
  chunk: string,
): { output: Buffer<ArrayBufferLike>; truncated: boolean } {
  const combined = Buffer.concat([existing, Buffer.from(chunk)]);
  if (combined.byteLength <= MAX_CAPTURED_OUTPUT_BYTES) {
    return { output: combined, truncated: false };
  }

  return {
    output: combined.subarray(combined.byteLength - MAX_CAPTURED_OUTPUT_BYTES),
    truncated: true,
  };
}

function createOutputEmitter(
  stream: "stdout" | "stderr",
  onOutput: ((event: { stream: "stdout" | "stderr"; text: string }) => void) | undefined,
): { write(chunk: string): void; flush(): void } {
  let pending = "";

  const emit = (text: string) => {
    if (text.length > 0) {
      onOutput?.({ stream, text: redactProcessOutput(text) });
    }
  };

  return {
    write(chunk) {
      pending += chunk;
      const lastNewline = Math.max(pending.lastIndexOf("\n"), pending.lastIndexOf("\r"));
      if (lastNewline < 0) {
        return;
      }
      emit(pending.slice(0, lastNewline + 1));
      pending = pending.slice(lastNewline + 1);
    },
    flush() {
      emit(pending);
      pending = "";
    },
  };
}
