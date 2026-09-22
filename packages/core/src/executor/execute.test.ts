import {
  access,
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { InstallationOperation } from "../operations/types.js";

import { isSafeExecutableName } from "./command-name.js";
import { executeInstallation as executeCoreInstallation } from "./execute.js";
import type {
  ExecuteOptions,
  ExecutorFileSystem,
  ProcessRunRequest,
  ProcessRunner,
} from "./types.js";

const tempDirs: string[] = [];

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

function executeInstallation(
  operations: Parameters<typeof executeCoreInstallation>[0],
  options: Omit<ExecuteOptions, "fs">,
) {
  return executeCoreInstallation(operations, { ...options, fs: testFileSystem });
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-exec-"));
  tempDirs.push(root);
  return root;
}

function recordingRunner(
  runs: ProcessRunRequest[],
  result: { exitCode?: number; notFound?: boolean; stdout?: string; stderr?: string } = {},
): ProcessRunner {
  return async (request) => {
    runs.push(request);
    const response = {
      exitCode: result.exitCode ?? 0,
      stdout: result.stdout ?? "",
      stderr:
        result.stderr ?? (result.exitCode === undefined || result.exitCode === 0 ? "" : "failed"),
    };
    if (result.notFound === true) {
      return { ...response, exitCode: 1, notFound: true };
    }
    return response;
  };
}

describe("isSafeExecutableName", () => {
  it("accepts simple executable names used by adapters", () => {
    expect(isSafeExecutableName("node")).toBe(true);
    expect(isSafeExecutableName("pnpm")).toBe(true);
    expect(isSafeExecutableName("npx")).toBe(true);
  });

  it("rejects shell strings and path traversal", () => {
    expect(isSafeExecutableName("pnpm add zod")).toBe(false);
    expect(isSafeExecutableName("../bin/node")).toBe(false);
    expect(isSafeExecutableName("node;rm")).toBe(false);
  });
});

describe("executeInstallation", () => {
  it("creates directories and files without running processes", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [
        {
          type: "create_directory",
          path: "src",
          behavior: "fail_if_exists",
          description: "Create src",
        },
        {
          type: "create_file",
          path: "src/app.txt",
          content: "hello\n",
          behavior: "fail_if_exists",
          description: "Write app.txt",
        },
      ],
      { rootDir: root, runProcess: recordingRunner(runs) },
    );

    expect(result).toMatchObject({ ok: true, executed: 2 });
    expect(runs).toEqual([]);
    expect(await readFile(path.join(root, "src/app.txt"), "utf8")).toBe("hello\n");
  });

  it("refuses to overwrite when fail_if_exists is set", async () => {
    const root = await tempRoot();
    const first: InstallationOperation = {
      type: "create_file",
      path: "keep.txt",
      content: "one\n",
      behavior: "fail_if_exists",
      description: "Write keep.txt",
    };

    await executeInstallation([first], { rootDir: root, runProcess: recordingRunner([]) });
    const result = await executeInstallation(
      [
        { ...first, content: "two\n" },
        {
          type: "create_file",
          path: "other.txt",
          content: "nope\n",
          behavior: "fail_if_exists",
          description: "Should not run",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]) },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("FILE_ALREADY_EXISTS");
    expect(result.executed).toBe(0);
    expect(await readFile(path.join(root, "keep.txt"), "utf8")).toBe("one\n");
    await expect(readFile(path.join(root, "other.txt"), "utf8")).rejects.toThrow();
  });

  it("merges JSON, replaces unique text, and appends missing env keys", async () => {
    const root = await tempRoot();
    const result = await executeInstallation(
      [
        {
          type: "create_file",
          path: "package.json",
          content: `${JSON.stringify({ name: "demo", scripts: { dev: "next" } }, null, 2)}\n`,
          behavior: "fail_if_exists",
          description: "Write package.json",
        },
        {
          type: "modify_json",
          path: "package.json",
          merge: { scripts: { test: "vitest" } },
          behavior: "merge",
          description: "Add test script",
        },
        {
          type: "create_file",
          path: "readme.txt",
          content: "hello world\n",
          behavior: "fail_if_exists",
          description: "Write readme",
        },
        {
          type: "modify_text",
          path: "readme.txt",
          oldText: "world",
          newText: "reposetup",
          description: "Rename in readme",
        },
        {
          type: "add_env_example",
          path: ".env.example",
          entries: [
            { key: "DATABASE_URL", placeholder: "file:./dev.db" },
            { key: "DATABASE_URL", placeholder: "ignored" },
          ],
          description: "Add DATABASE_URL",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]) },
    );

    expect(result.ok).toBe(true);
    expect(JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))).toEqual({
      name: "demo",
      scripts: { dev: "next", test: "vitest" },
    });
    expect(await readFile(path.join(root, "readme.txt"), "utf8")).toBe("hello reposetup\n");
    expect(await readFile(path.join(root, ".env.example"), "utf8")).toBe(
      "DATABASE_URL=file:./dev.db\n",
    );

    const again = await executeInstallation(
      [
        {
          type: "add_env_example",
          path: ".env.example",
          entries: [{ key: "DATABASE_URL", placeholder: "changed" }],
          description: "Skip existing DATABASE_URL",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]) },
    );

    expect(again.ok).toBe(true);
    expect(await readFile(path.join(root, ".env.example"), "utf8")).toBe(
      "DATABASE_URL=file:./dev.db\n",
    );
  });

  it("expands install_package through the package-manager adapter", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [
        {
          type: "install_package",
          packageManager: "pnpm",
          packages: ["zod"],
          cwd: ".",
          description: "Install Zod",
        },
      ],
      { rootDir: root, runProcess: recordingRunner(runs) },
    );

    expect(result.ok).toBe(true);
    expect(runs).toEqual([
      {
        command: "pnpm",
        args: ["add", "zod"],
        cwd: path.resolve(root),
      },
    ]);
  });

  it("stops after a failed command and does not run later operations", async () => {
    const root = await tempRoot();
    const result = await executeInstallation(
      [
        {
          type: "create_file",
          path: "before.txt",
          content: "ok\n",
          behavior: "fail_if_exists",
          description: "Write before",
        },
        {
          type: "run_command",
          command: "node",
          args: ["-e", "process.exit(2)"],
          cwd: ".",
          description: "Fail",
        },
        {
          type: "create_file",
          path: "after.txt",
          content: "nope\n",
          behavior: "fail_if_exists",
          description: "Should not run",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([], { exitCode: 2 }) },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("COMMAND_FAILED");
    expect(result.executed).toBe(1);
    expect(await readFile(path.join(root, "before.txt"), "utf8")).toBe("ok\n");
    await expect(readFile(path.join(root, "after.txt"), "utf8")).rejects.toThrow();
  });

  it("does not begin an operation after cancellation", async () => {
    const root = await tempRoot();
    const controller = new AbortController();
    controller.abort();
    const runs: ProcessRunRequest[] = [];

    const result = await executeInstallation(
      [
        {
          type: "create_file",
          path: "should-not-exist.txt",
          content: "nope\n",
          behavior: "fail_if_exists",
          description: "Must not write",
        },
      ],
      {
        rootDir: root,
        runProcess: recordingRunner(runs),
        signal: controller.signal,
      },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("EXECUTION_ABORTED");
    expect(runs).toEqual([]);
    await expect(readFile(path.join(root, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });

  it("classifies cancelled and timed-out commands without continuing", async () => {
    const root = await tempRoot();
    const operation: InstallationOperation = {
      type: "run_command",
      command: "node",
      args: ["-e", "process.exit(0)"],
      cwd: ".",
      description: "Run Node",
    };

    const cancelled = await executeInstallation([operation], {
      rootDir: root,
      runProcess: async () => ({ exitCode: 1, stdout: "", stderr: "", aborted: true }),
    });
    expect(cancelled).toMatchObject({ ok: false, executed: 0 });
    if (!cancelled.ok) {
      expect(cancelled.error.code).toBe("EXECUTION_ABORTED");
    }

    const timedOut = await executeInstallation([operation], {
      rootDir: root,
      runProcess: async () => ({ exitCode: 1, stdout: "", stderr: "", timedOut: true }),
    });
    expect(timedOut).toMatchObject({ ok: false, executed: 0 });
    if (!timedOut.ok) {
      expect(timedOut.error.code).toBe("COMMAND_TIMED_OUT");
    }
  });

  it("passes distinct regular and long-running timeout limits to process runners", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [
        {
          type: "run_command",
          command: "node",
          args: ["--version"],
          cwd: ".",
          description: "Regular command",
        },
        {
          type: "run_command",
          command: "node",
          args: ["--version"],
          cwd: ".",
          longRunning: true,
          description: "Long-running command",
        },
      ],
      {
        rootDir: root,
        runProcess: recordingRunner(runs),
        commandTimeoutMs: 123,
        longRunningCommandTimeoutMs: 456,
      },
    );

    expect(result.ok).toBe(true);
    expect(runs.map((run) => run.timeoutMs)).toEqual([123, 456]);
  });

  it("does not attach command stdout or stderr to COMMAND_FAILED details", async () => {
    const root = await tempRoot();
    const result = await executeInstallation(
      [
        {
          type: "run_command",
          command: "node",
          args: ["-e", "process.exit(2)"],
          cwd: ".",
          description: "Fail with secrets on stdout",
        },
      ],
      {
        rootDir: root,
        runProcess: recordingRunner([], {
          exitCode: 2,
          stdout: "DATABASE_URL=super-secret",
          stderr: "token=super-secret",
        }),
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("COMMAND_FAILED");
    expect(result.error.details).toEqual({
      command: "node",
      args: ["-e", "process.exit(2)"],
      exitCode: 2,
    });
    expect(JSON.stringify(result.error)).not.toContain("super-secret");
  });

  it("prints a redacted command snippet on failure without putting it in error details", async () => {
    const root = await tempRoot();
    const messages: string[] = [];
    const result = await executeInstallation(
      [
        {
          type: "run_command",
          command: "npx",
          args: ["--yes", "create-next-app@latest"],
          cwd: ".",
          description: "Scaffold Next.js",
        },
      ],
      {
        rootDir: root,
        logger: {
          info(message) {
            messages.push(message);
          },
          verbose() {},
        },
        runProcess: recordingRunner([], {
          exitCode: 243,
          stderr:
            "npm error code EACCES\nYour cache folder contains root-owned files, due to a bug\ntoken=super-secret",
        }),
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.details).not.toHaveProperty("stderr");
    expect(result.error.message).toContain("exited with code 243");
    expect(result.error.message).toContain("cache folder contains root-owned files");
    expect(result.error.message).toContain("token=<redacted>");
    expect(JSON.stringify(result.error)).not.toContain("super-secret");
    expect(result.error.suggestion).toContain("will not run sudo");
    expect(messages.join("\n")).toContain("cache folder contains root-owned files");
    expect(messages.join("\n")).toContain("token=<redacted>");
    expect(messages.join("\n")).not.toContain("super-secret");
  });

  it("does not install missing prerequisites", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [
        {
          type: "check_prerequisite",
          id: "pnpm",
          description: "Require pnpm",
        },
        {
          type: "run_command",
          command: "pnpm",
          args: ["add", "zod"],
          cwd: ".",
          description: "Should not run",
        },
      ],
      {
        rootDir: root,
        runProcess: recordingRunner(runs),
        commandExists: async () => false,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PREREQUISITE_MISSING");
    expect(result.error.suggestion).toContain("https://pnpm.io/installation");
    expect(runs).toEqual([]);
  });

  it("rejects unknown prerequisite ids instead of executing them", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [{ type: "check_prerequisite", id: "docker", description: "Require Docker" }],
      { rootDir: root, runProcess: recordingRunner(runs) },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
    expect(runs).toEqual([]);
  });

  it("records show_message and treats command-less verify as a no-op", async () => {
    const root = await tempRoot();
    const result = await executeInstallation(
      [
        {
          type: "show_message",
          message: "SQLite is file-based.",
          description: "Explain SQLite",
        },
        {
          type: "verify",
          cwd: ".",
          description: "Nothing to run yet",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.logs).toContain("SQLite is file-based.");
  });

  it("maps a failed verify command to VERIFICATION_FAILED", async () => {
    const root = await tempRoot();
    const result = await executeInstallation(
      [
        {
          type: "verify",
          cwd: ".",
          command: "node",
          args: ["-e", "process.exit(1)"],
          description: "Verify project",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([], { exitCode: 1 }) },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("VERIFICATION_FAILED");
  });

  it("rejects a command string that is not a single executable", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [
        {
          type: "run_command",
          command: "pnpm add zod",
          args: [],
          cwd: ".",
          description: "Unsafe shell string",
        },
      ],
      { rootDir: root, runProcess: recordingRunner(runs) },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
    expect(runs).toEqual([]);
  });
});
