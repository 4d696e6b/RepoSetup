import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_CAPTURED_OUTPUT_BYTES,
  createDefaultExecutorFileSystem,
  createDefaultExecutionLock,
  createDefaultExecutionJournal,
  createDefaultExecutableResolver,
  createDefaultProcessRunner,
  resolveWindowsLaunch,
} from "./execution-adapters.js";

describe("createDefaultExecutorFileSystem", () => {
  it("atomically replaces a final-component symlink without modifying its target", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-atomic-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "reposetup-atomic-outside-"));
    const target = path.join(outside, "target.txt");
    const destination = path.join(root, "destination.txt");

    try {
      await writeFile(target, "outside\n", "utf8");
      await symlink(target, destination);

      await createDefaultExecutorFileSystem().writeFileAtomic(destination, "inside\n");

      expect(await readFile(destination, "utf8")).toBe("inside\n");
      expect(await readFile(target, "utf8")).toBe("outside\n");
    } finally {
      await Promise.all([
        rm(root, { recursive: true, force: true }),
        rm(outside, { recursive: true, force: true }),
      ]);
    }
  });
});

describe("createDefaultExecutionLock", () => {
  it("prevents a second lock for the same project and releases the first", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-lock-project-"));
    const lock = createDefaultExecutionLock();

    try {
      const first = await lock.acquire(root);
      expect(first.ok).toBe(true);
      const second = await lock.acquire(root);
      expect(second).toEqual({ ok: false, reason: "already_locked" });

      if (!first.ok) {
        return;
      }
      await first.handle.release();
      const third = await lock.acquire(root);
      expect(third).toMatchObject({ ok: true });
      if (third.ok) {
        await third.handle.release();
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("createDefaultExecutionJournal", () => {
  it("keeps a failed journal without operation contents and removes a successful one", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reposetup-journal-"));
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "reposetup-journal-project-"));

    try {
      const failed = createDefaultExecutionJournal({ directory });
      await failed.start(projectRoot);
      await failed.record({
        operationId: "safe-id",
        index: 0,
        operationType: "create_file",
        status: "failed",
        errorCode: "FILE_MUTATION_FAILED",
      });
      await failed.finish("failed");

      const [failureFile] = await readdir(directory);
      expect(failureFile).toBeDefined();
      if (failureFile === undefined) {
        return;
      }
      const content = await readFile(path.join(directory, failureFile), "utf8");
      expect(content).toContain("safe-id");
      expect(content).not.toContain(projectRoot);

      const succeeded = createDefaultExecutionJournal({ directory });
      await succeeded.start(projectRoot);
      await succeeded.finish("succeeded");
      expect(await readdir(directory)).toEqual([failureFile]);
    } finally {
      await Promise.all([
        rm(directory, { recursive: true, force: true }),
        rm(projectRoot, { recursive: true, force: true }),
      ]);
    }
  });
});

describe("createDefaultProcessRunner", () => {
  it("terminates a timed-out process and reports the timeout", async () => {
    const runner = createDefaultProcessRunner();
    const result = await runner({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10_000)"],
      cwd: process.cwd(),
      timeoutMs: 20,
    });

    expect(result.timedOut).toBe(true);
  });

  it("terminates an aborted process and reports cancellation", async () => {
    const runner = createDefaultProcessRunner();
    const controller = new AbortController();
    const pending = runner({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10_000)"],
      cwd: process.cwd(),
      signal: controller.signal,
    });
    controller.abort();

    const result = await pending;
    expect(result.aborted).toBe(true);
  });

  it.skipIf(process.platform === "win32")(
    "terminates a descendant process when execution is cancelled",
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-process-tree-"));
      const marker = path.join(root, "descendant-ran.txt");
      const runner = createDefaultProcessRunner();
      const controller = new AbortController();
      let ready: (() => void) | undefined;
      const childReady = new Promise<void>((resolve) => {
        ready = resolve;
      });

      try {
        const pending = runner({
          command: process.execPath,
          args: [
            "-e",
            `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(`setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran'), 400)`)}], { stdio: 'ignore' }); console.log('ready'); setTimeout(() => {}, 10_000)`,
          ],
          cwd: root,
          signal: controller.signal,
          onOutput(event) {
            if (event.text.includes("ready")) {
              ready?.();
            }
          },
        });
        await childReady;
        controller.abort();

        expect(await pending).toMatchObject({ aborted: true });
        await new Promise((resolve) => setTimeout(resolve, 500));
        await expect(readFile(marker, "utf8")).rejects.toThrow();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it("bounds captured output while retaining the latest bytes", async () => {
    const runner = createDefaultProcessRunner();
    const result = await runner({
      command: process.execPath,
      args: ["-e", `process.stdout.write('x'.repeat(${MAX_CAPTURED_OUTPUT_BYTES + 1}))`],
      cwd: process.cwd(),
    });

    expect(result.outputTruncated).toBe(true);
    expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(MAX_CAPTURED_OUTPUT_BYTES);
    expect(result.stdout).toMatch(/x+$/);
  });

  it("redacts a secret assignment split across output chunks before emitting it", async () => {
    const runner = createDefaultProcessRunner();
    const output: string[] = [];
    const result = await runner({
      command: process.execPath,
      args: [
        "-e",
        "process.stdout.write('TOKEN=super'); setTimeout(() => process.stdout.write('-secret\\n'), 10)",
      ],
      cwd: process.cwd(),
      onOutput(event) {
        output.push(event.text);
      },
    });

    expect(result.exitCode).toBe(0);
    expect(output.join("")).toContain("TOKEN=<redacted>");
    expect(output.join("")).not.toContain("super-secret");
  });
});

describe("resolveWindowsLaunch", () => {
  it("runs a trusted .cmd shim through cmd.exe without enabling shell mode", () => {
    const launch = resolveWindowsLaunch(
      "pnpm",
      ["add", "zod"],
      {
        PATH: "C:\\Program Files\\nodejs;C:\\tools",
        PATHEXT: ".EXE;.CMD",
        ComSpec: "C:\\Windows\\System32\\cmd.exe",
      },
      (filePath) => filePath === "C:\\Program Files\\nodejs\\pnpm.cmd",
    );

    expect(launch).toEqual({
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/v:off", "/c", "C:\\Program Files\\nodejs\\pnpm.cmd", "add", "zod"],
    });
  });

  it("preserves a literal exclamation mark with delayed expansion disabled", () => {
    const launch = resolveWindowsLaunch(
      "pnpm",
      ["add", "--allow-build=!better-sqlite3", "better-sqlite3"],
      { PATH: "C:\\tools", PATHEXT: ".CMD" },
      (filePath) => filePath === "C:\\tools\\pnpm.cmd",
    );

    expect(launch).toEqual({
      command: "cmd.exe",
      args: [
        "/d",
        "/v:off",
        "/c",
        "C:\\tools\\pnpm.cmd",
        "add",
        "--allow-build=!better-sqlite3",
        "better-sqlite3",
      ],
    });
  });

  it("runs a trusted native executable directly", () => {
    const launch = resolveWindowsLaunch(
      "node",
      ["--version"],
      { PATH: "C:\\Program Files\\nodejs", PATHEXT: ".EXE;.CMD" },
      (filePath) => filePath === "C:\\Program Files\\nodejs\\node.exe",
    );

    expect(launch).toEqual({
      command: "C:\\Program Files\\nodejs\\node.exe",
      args: ["--version"],
    });
  });

  it("rejects shim arguments that could change the command grammar", () => {
    const launch = resolveWindowsLaunch(
      "pnpm",
      ["add", "safe-package & whoami"],
      { PATH: "C:\\tools", PATHEXT: ".CMD" },
      () => true,
    );

    expect(launch).toMatchObject({ error: expect.stringContaining("shell metacharacters") });
  });
});

describe("createDefaultExecutableResolver", () => {
  it("selects and caches the first platform Python candidate", async () => {
    const runs: string[] = [];
    const expected = process.platform === "win32" ? "python" : "python3";
    const resolver = createDefaultExecutableResolver(async (request) => {
      runs.push(request.command);
      return {
        exitCode: request.command === expected ? 0 : 1,
        stdout: "Python 3.12.0\n",
        stderr: "",
        ...(request.command === expected ? {} : { notFound: true }),
      };
    });

    expect(await resolver("python")).toBe(expected);
    expect(await resolver("python")).toBe(expected);
    expect(await resolver("pnpm")).toBe("pnpm");
    expect(runs).toEqual(process.platform === "win32" ? ["py", "python"] : ["python3"]);
  });
});
