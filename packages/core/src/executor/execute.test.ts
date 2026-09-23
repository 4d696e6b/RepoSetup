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
  symlink,
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
  ExecutionEvent,
  ExecutionJournalEntry,
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

  it("emits safe operation timing events", async () => {
    const root = await tempRoot();
    const events: ExecutionEvent[] = [];
    const result = await executeInstallation(
      [
        {
          type: "show_message",
          message: "Ready.",
          description: "Show readiness",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]), onEvent: (event) => events.push(event) },
    );

    expect(result.ok).toBe(true);
    expect(events).toEqual([
      {
        type: "operation_started",
        index: 0,
        operationType: "show_message",
        description: "Show readiness",
      },
      expect.objectContaining({
        type: "operation_succeeded",
        index: 0,
        operationType: "show_message",
        description: "Show readiness",
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("records only safe operation identities in the failure journal", async () => {
    const root = await tempRoot();
    const entries: ExecutionJournalEntry[] = [];
    const outcomes: string[] = [];
    const result = await executeInstallation(
      [
        {
          type: "create_file",
          path: "safe.txt",
          content: "TOKEN=must-not-appear",
          behavior: "fail_if_exists",
          description: "Write a secret-like value",
        },
      ],
      {
        rootDir: root,
        runProcess: recordingRunner([]),
        executionJournal: {
          async start() {},
          async record(entry) {
            entries.push(entry);
          },
          async finish(outcome) {
            outcomes.push(outcome);
          },
        },
      },
    );

    expect(result.ok).toBe(true);
    expect(entries).toEqual([
      expect.objectContaining({ index: 0, operationType: "create_file", status: "started" }),
      expect.objectContaining({ index: 0, operationType: "create_file", status: "succeeded" }),
    ]);
    expect(JSON.stringify(entries)).not.toContain("must-not-appear");
    expect(outcomes).toEqual(["succeeded"]);
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

  it("refuses a file path that escapes through a symlink", async () => {
    const root = await tempRoot();
    const outside = await tempRoot();
    await symlink(outside, path.join(root, "linked"));

    const result = await executeInstallation(
      [
        {
          type: "create_file",
          path: "linked/escaped.txt",
          content: "nope\n",
          behavior: "fail_if_exists",
          description: "Must not escape",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]) },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
    await expect(readFile(path.join(outside, "escaped.txt"), "utf8")).rejects.toThrow();
  });

  it("writes Unicode paths below a project root with spaces in its parent path", async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), "RepoSetup parent 日本語 path-"));
    tempDirs.push(parent);
    const root = path.join(parent, "project");
    await mkdir(root);

    const result = await executeInstallation(
      [
        {
          type: "create_file",
          path: "src/日本語.txt",
          content: "portable\n",
          behavior: "fail_if_exists",
          description: "Write a Unicode project file",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]) },
    );

    expect(result).toMatchObject({ ok: true, executed: 1 });
    expect(await readFile(path.join(root, "src", "日本語.txt"), "utf8")).toBe("portable\n");
  });

  it("refuses a final-component symlink without writing outside the root", async () => {
    const root = await tempRoot();
    const outside = await tempRoot();
    const outsideFile = path.join(outside, "package.json");
    await writeFile(outsideFile, '{"outside":true}\n', "utf8");
    await symlink(outsideFile, path.join(root, "package.json"));

    const result = await executeInstallation(
      [
        {
          type: "modify_json",
          path: "package.json",
          merge: { name: "inside" },
          behavior: "merge",
          description: "Update package metadata",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]) },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PLAN_INVALID");
    expect(await readFile(outsideFile, "utf8")).toBe('{"outside":true}\n');
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

  it("preserves CRLF when appending to an existing environment example", async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, ".env.example"), "EXISTING=value\r\n", "utf8");

    const result = await executeInstallation(
      [
        {
          type: "add_env_example",
          path: ".env.example",
          entries: [{ key: "NEW_VALUE", placeholder: "replace-me" }],
          description: "Add a portable environment placeholder",
        },
      ],
      { rootDir: root, runProcess: recordingRunner([]) },
    );

    expect(result).toMatchObject({ ok: true, executed: 1 });
    expect(await readFile(path.join(root, ".env.example"), "utf8")).toBe(
      "EXISTING=value\r\nNEW_VALUE=replace-me\r\n",
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

  it("uses the selected Python interpreter for prerequisite and planned commands", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [
        { type: "check_prerequisite", id: "python", description: "Require Python" },
        {
          type: "run_command",
          command: "python",
          args: ["-m", "pip", "--version"],
          cwd: ".",
          description: "Inspect pip",
        },
      ],
      {
        rootDir: root,
        commandExists: async (command) => command === "python3",
        resolveExecutable: async (command) => (command === "python" ? "python3" : command),
        runProcess: recordingRunner(runs, { stdout: "Python 3.12.0\n" }),
      },
    );

    expect(result).toMatchObject({ ok: true, executed: 2 });
    expect(runs).toEqual([
      expect.objectContaining({ command: "python3", args: ["--version"] }),
      expect.objectContaining({ command: "python3", args: ["-m", "pip", "--version"] }),
    ]);
  });

  it("rejects a prerequisite version below the documented minimum before mutation", async () => {
    const root = await tempRoot();
    const result = await executeInstallation(
      [
        { type: "check_prerequisite", id: "node", description: "Require Node.js" },
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
        commandExists: async () => true,
        runProcess: recordingRunner([], { stdout: "v20.8.0\n" }),
      },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PREREQUISITE_MISSING");
    expect(result.error.details).toMatchObject({ detectedVersion: "20.8.0" });
    await expect(readFile(path.join(root, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });

  it("accepts a prerequisite version at the documented minimum", async () => {
    const root = await tempRoot();
    const result = await executeInstallation(
      [{ type: "check_prerequisite", id: "node", description: "Require Node.js" }],
      {
        rootDir: root,
        commandExists: async () => true,
        runProcess: recordingRunner([], { stdout: "v20.9.0\n" }),
      },
    );

    expect(result).toMatchObject({ ok: true, executed: 1 });
  });

  it("rejects a Node version outside a qualified range before mutation", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [
        {
          type: "check_prerequisite",
          id: "node",
          versionRange: "^20.19.0 || >=22.12.0",
          description: "Require a Vite-compatible Node.js",
        },
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
        commandExists: async () => true,
        runProcess: recordingRunner(runs, { stdout: "v22.11.0\n" }),
      },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PREREQUISITE_MISSING");
    expect(result.error.details).toMatchObject({ versionRange: "^20.19.0 || >=22.12.0" });
    expect(runs).toEqual([expect.objectContaining({ args: ["--version"] })]);
    await expect(readFile(path.join(root, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });

  it("checks prerequisites before any planned project mutation", async () => {
    const root = await tempRoot();
    const result = await executeInstallation(
      [
        {
          type: "create_file",
          path: "should-not-exist.txt",
          content: "nope\n",
          behavior: "fail_if_exists",
          description: "Write only after preflight",
        },
        {
          type: "check_prerequisite",
          id: "pnpm",
          description: "Require pnpm",
        },
      ],
      {
        rootDir: root,
        runProcess: recordingRunner([]),
        commandExists: async () => false,
      },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PREREQUISITE_MISSING");
    await expect(readFile(path.join(root, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });

  it("fails preflight for a missing project root before running commands", async () => {
    const root = await tempRoot();
    const missingRoot = path.join(root, "missing");
    const runs: ProcessRunRequest[] = [];
    const result = await executeInstallation(
      [
        {
          type: "run_command",
          command: "node",
          args: ["--version"],
          cwd: ".",
          description: "Must not run",
        },
      ],
      { rootDir: missingRoot, runProcess: recordingRunner(runs) },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("PROJECT_NOT_FOUND");
    expect(runs).toEqual([]);
  });

  it("fails writable-location preflight before commands or mutations", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeCoreInstallation(
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
        fs: { ...testFileSystem, canWrite: async () => false },
        runProcess: recordingRunner(runs),
      },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("FILE_MUTATION_FAILED");
    expect(runs).toEqual([]);
    await expect(readFile(path.join(root, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });

  it("fails disk-space preflight before commands or mutations", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeCoreInstallation(
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
        fs: { ...testFileSystem, availableDiskBytes: async () => 0 },
        runProcess: recordingRunner(runs),
        minimumFreeDiskBytes: 1,
      },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("FILE_MUTATION_FAILED");
    expect(runs).toEqual([]);
    await expect(readFile(path.join(root, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });

  it("rejects a conflicting package-manager lockfile before installation", async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const runs: ProcessRunRequest[] = [];
    const result = await executeCoreInstallation(
      [
        {
          type: "install_package",
          packageManager: "npm",
          packages: ["zod"],
          dev: false,
          cwd: ".",
          description: "Install zod",
        },
      ],
      { rootDir: root, fs: testFileSystem, runProcess: recordingRunner(runs) },
    );
    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (!result.ok) expect(result.error.code).toBe("LOCKFILE_CONFLICT");
    expect(runs).toEqual([]);
  });

  it("rejects a lockfile that conflicts with a scaffold command before spawning it", async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const runs: ProcessRunRequest[] = [];
    const result = await executeCoreInstallation(
      [
        {
          type: "run_command",
          command: "npx",
          args: ["--yes", "create-next-app@16.3.6", "app"],
          cwd: ".",
          description: "Scaffold Next.js",
        },
      ],
      { rootDir: root, fs: testFileSystem, runProcess: recordingRunner(runs) },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (!result.ok) expect(result.error.code).toBe("LOCKFILE_CONFLICT");
    expect(runs).toEqual([]);
  });

  it("does not run npm ci when the required lockfile is missing", async () => {
    const root = await tempRoot();
    const runs: ProcessRunRequest[] = [];
    const result = await executeCoreInstallation(
      [
        {
          type: "run_command",
          command: "npm",
          args: ["ci"],
          cwd: ".",
          description: "Install from package-lock.json",
          requiresLockfile: "package-lock.json",
        },
        {
          type: "create_file",
          path: "should-not-exist.txt",
          content: "nope\n",
          behavior: "fail_if_exists",
          description: "Must not write",
        },
      ],
      { rootDir: root, fs: testFileSystem, runProcess: recordingRunner(runs) },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (!result.ok) expect(result.error.code).toBe("LOCKFILE_CONFLICT");
    expect(runs).toEqual([]);
    await expect(readFile(path.join(root, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });

  it("retries one classified transient failure for a locked install", async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, "package-lock.json"), "{}\n");
    let attempts = 0;
    const result = await executeCoreInstallation(
      [
        {
          type: "run_command",
          command: "npm",
          args: ["ci"],
          cwd: ".",
          description: "Locked install",
          requiresLockfile: "package-lock.json",
        },
      ],
      {
        rootDir: root,
        fs: testFileSystem,
        runProcess: async () =>
          ++attempts === 1
            ? { exitCode: 1, stdout: "", stderr: "ETIMEDOUT" }
            : { exitCode: 0, stdout: "", stderr: "" },
      },
    );
    expect(result).toMatchObject({ ok: true, executed: 1 });
    expect(attempts).toBe(2);
  });

  it("refuses a concurrent execution before commands or mutations begin", async () => {
    const root = await tempRoot();
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
        executionLock: {
          async acquire() {
            return { ok: false, reason: "already_locked" };
          },
        },
      },
    );

    expect(result).toMatchObject({ ok: false, executed: 0 });
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("EXECUTION_LOCKED");
    expect(runs).toEqual([]);
    await expect(readFile(path.join(root, "should-not-exist.txt"), "utf8")).rejects.toThrow();
  });

  it("releases an acquired execution lock after a failed operation", async () => {
    const root = await tempRoot();
    let releases = 0;
    const result = await executeInstallation(
      [
        {
          type: "run_command",
          command: "node",
          args: ["-e", "process.exit(2)"],
          cwd: ".",
          description: "Fail",
        },
      ],
      {
        rootDir: root,
        runProcess: recordingRunner([], { exitCode: 2 }),
        executionLock: {
          async acquire() {
            return {
              ok: true,
              handle: {
                async release() {
                  releases += 1;
                },
              },
            };
          },
        },
      },
    );

    expect(result.ok).toBe(false);
    expect(releases).toBe(1);
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
