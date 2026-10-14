import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  MAX_CAPTURED_OUTPUT_BYTES,
  childProcessEnvironment,
  createDefaultExecutorFileSystem,
  createDefaultExecutionLock,
  createDefaultExecutionJournal,
  createDefaultExecutableResolver,
  createDefaultProcessRunner,
  createDefaultCommandExists,
  createDefaultCommandVersion,
  resolveWindowsLaunch,
} from "./execution-adapters.js";

describe("bounded prerequisite inspection", () => {
  it.each(["timedOut", "aborted", "notFound"] as const)(
    "does not report a %s version probe as available",
    async (failure) => {
      const runner = vi.fn(async () => ({
        exitCode: 0,
        stdout: "Docker version 29.0.0",
        stderr: "",
        [failure]: true,
      }));
      expect(await createDefaultCommandExists(runner)("docker")).toBe(false);
      expect(await createDefaultCommandVersion(runner)("docker")).toBeUndefined();
      expect(runner).toHaveBeenCalledWith(
        expect.objectContaining({ command: "docker", args: ["--version"], timeoutMs: 5_000 }),
      );
    },
  );
});

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

  it("uses the same lock for real and symlinked paths to one project", async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), "reposetup-lock-alias-"));
    const root = path.join(parent, "project");
    const alias = path.join(parent, "alias");
    await mkdir(root);
    await symlink(root, alias, process.platform === "win32" ? "junction" : "dir");
    const lock = createDefaultExecutionLock();

    try {
      const first = await lock.acquire(root);
      expect(first.ok).toBe(true);
      const second = await lock.acquire(alias);
      expect(second).toEqual({ ok: false, reason: "already_locked" });
      if (!first.ok) return;
      await first.handle.release();
      const third = await lock.acquire(alias);
      expect(third.ok).toBe(true);
      if (third.ok) await third.handle.release();
    } finally {
      await rm(parent, { recursive: true, force: true });
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

describe("nested npm execution environment", () => {
  it("drops outer exec options and preserves install configuration without mutating the parent", () => {
    const original = {
      npm_config_package: "rsetup.tgz",
      NPM_CONFIG_CALL: "outer command",
      npm_config_user_agent: "pnpm/12.5.1 npm/? node/v24.21.0",
      NPM_EXECPATH: "outer/pnpm.cjs",
      npm_node_execpath: "outer/node",
      npm_config_cache: "cache",
      npm_config_registry: "https://registry.npmjs.org",
      PATH: "tools",
    };
    expect(childProcessEnvironment(original)).toEqual({
      npm_config_cache: "cache",
      npm_config_registry: "https://registry.npmjs.org",
      PATH: "tools",
    });
    expect(original.npm_config_package).toBe("rsetup.tgz");
  });
});

describe("createDefaultProcessRunner", () => {
  it("keeps an explicit task environment isolated from ambient credentials and npm identity", async () => {
    vi.stubEnv("REPOSETUP_TEST_AMBIENT_SECRET", "fictional-secret");
    vi.stubEnv("npm_config_package", "outer-package");
    try {
      const result = await createDefaultProcessRunner()({
        command: process.execPath,
        args: [
          "-e",
          "console.log(JSON.stringify({ marker: process.env.REPOSETUP_TEST_TASK_MARKER, secret: process.env.REPOSETUP_TEST_AMBIENT_SECRET, package: process.env.npm_config_package }))",
        ],
        cwd: process.cwd(),
        env: { REPOSETUP_TEST_TASK_MARKER: "allowed" },
      });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ marker: "allowed" });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps a supplied verifier environment isolated from the host", async () => {
    vi.stubEnv("REPOSETUP_PARENT_ONLY", "parent");
    try {
      const result = await createDefaultProcessRunner()({
        command: process.execPath,
        args: [
          "-e",
          "console.log(JSON.stringify({parent: process.env.REPOSETUP_PARENT_ONLY ?? null, supplied: process.env.REPOSETUP_CHECK_ONLY}))",
        ],
        cwd: process.cwd(),
        env: { REPOSETUP_CHECK_ONLY: "check" },
        timeoutMs: 5000,
      });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ parent: null, supplied: "check" });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("filters outer npm launch options when no explicit environment is supplied", async () => {
    vi.stubEnv("npm_config_package", "outer-package");
    try {
      const result = await createDefaultProcessRunner()({
        command: process.execPath,
        args: ["-e", "console.log(process.env.npm_config_package ?? 'absent')"],
        cwd: process.cwd(),
        timeoutMs: 5000,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("absent");
    } finally {
      vi.unstubAllEnvs();
    }
  });

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

  it.skipIf(process.platform === "win32")(
    "escalates cancellation for a task check ignoring SIGTERM",
    async () => {
      const controller = new AbortController();
      const result = await createDefaultProcessRunner()({
        command: process.execPath,
        args: [
          "-e",
          "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)",
        ],
        cwd: process.cwd(),
        signal: controller.signal,
        timeoutMs: 5000,
        terminationGraceMs: 20,
        onOutput(event) {
          if (event.text.includes("ready")) controller.abort();
        },
      });
      expect(result.aborted).toBe(true);
      expect(result.timedOut).not.toBe(true);
    },
  );

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

  it("drains oversized newline-free stdout and stderr under a fixed parent heap without callbacks", async () => {
    const moduleUrl = new URL("./execution-adapters.ts", import.meta.url).href;
    const child =
      "const b=Buffer.alloc(16384, 120); for(let i=0;i<4096;i++){process.stdout.write(b);process.stderr.write(b)}";
    const script = `import {createDefaultProcessRunner,MAX_CAPTURED_OUTPUT_BYTES} from ${JSON.stringify(moduleUrl)};
      const result=await createDefaultProcessRunner()({command:process.execPath,args:['-e',${JSON.stringify(child)}],cwd:process.cwd(),timeoutMs:15000});
      if(result.exitCode!==0 || result.timedOut || !result.outputTruncated || Buffer.byteLength(result.stdout)!==MAX_CAPTURED_OUTPUT_BYTES || Buffer.byteLength(result.stderr)!==MAX_CAPTURED_OUTPUT_BYTES) process.exitCode=1;
      console.log(JSON.stringify({exitCode:result.exitCode,truncated:result.outputTruncated,stdoutBytes:Buffer.byteLength(result.stdout),stderrBytes:Buffer.byteLength(result.stderr)}));`;
    const result = await createDefaultProcessRunner()({
      command: process.execPath,
      args: [
        "--max-old-space-size=48",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        script,
      ],
      cwd: path.dirname(fileURLToPath(import.meta.url)),
      env: { PATH: process.env.PATH ?? "", LANG: "C", LC_ALL: "C" },
      timeoutMs: 20000,
      terminationGraceMs: 100,
    });
    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.timedOut).not.toBe(true);
    expect(JSON.parse(result.stdout)).toEqual({
      exitCode: 0,
      truncated: true,
      stdoutBytes: MAX_CAPTURED_OUTPUT_BYTES,
      stderrBytes: MAX_CAPTURED_OUTPUT_BYTES,
    });
  }, 30000);

  it.each(["stdout", "stderr"] as const)(
    "bounds oversized callback records on %s while draining the process",
    async (stream) => {
      const output: string[] = [];
      const result = await createDefaultProcessRunner()({
        command: process.execPath,
        args: [
          "-e",
          `const s=process.${stream}; s.write('x'.repeat(${MAX_CAPTURED_OUTPUT_BYTES * 8})); s.write('\\nTOKEN=fixture-secret\\r\\nfinished\\n');`,
        ],
        cwd: process.cwd(),
        onOutput(event) {
          expect(event.stream).toBe(stream);
          expect(Buffer.byteLength(event.text)).toBeLessThanOrEqual(MAX_CAPTURED_OUTPUT_BYTES);
          output.push(event.text);
        },
      });
      expect(result.exitCode).toBe(0);
      expect(result.outputTruncated).toBe(true);
      expect(output.join("")).toBe(
        "[output record omitted: exceeds byte limit; streaming suppressed]\n",
      );
      expect(output.join("")).not.toContain("fixture-secret");
    },
  );

  it("discards a multibyte overlong secret line through EOF without emitting credential fragments", async () => {
    const output: string[] = [];
    const result = await createDefaultProcessRunner()({
      command: process.execPath,
      args: [
        "-e",
        `process.stdout.write('TOKEN='); process.stdout.write('🦀'.repeat(${MAX_CAPTURED_OUTPUT_BYTES / 2})); process.stdout.write('fictional-secret-tail');`,
      ],
      cwd: process.cwd(),
      onOutput(event) {
        output.push(event.text);
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputTruncated).toBe(true);
    expect(output.join("")).toBe(
      "[output record omitted: exceeds byte limit; streaming suppressed]\n",
    );
    expect(output.join("")).not.toContain("fictional-secret-tail");
  });

  it.each([
    ["TOKEN=\nfictional-secret\n"],
    ["TOKEN=\n", "fictional-secret\n"],
    ["TOKEN=\r\n", "fictional-secret\r\n"],
    ["TOKEN\n", "=\n", "fictional-secret\n"],
    ["AUTH_TOKEN=\r", "\nfictional-secret\n"],
  ])(
    "preserves multiline secret redaction across callback chunks %j",
    async (...chunks: string[]) => {
      const output: string[] = [];
      const script = `for (const part of ${JSON.stringify(chunks)}) {process.stdout.write(part);await new Promise(r=>setTimeout(r,10))}`;
      const result = await createDefaultProcessRunner()({
        command: process.execPath,
        args: ["--input-type=module", "-e", script],
        cwd: process.cwd(),
        onOutput(event) {
          output.push(event.text);
        },
      });
      expect(result.exitCode).toBe(0);
      expect(output.join("")).toMatch(/(?:TOKEN|AUTH_TOKEN)=<redacted>\r?\n$/);
      expect(output.join("")).not.toContain("fictional-secret");
    },
  );

  it("suppresses values after an oversized multiline assignment prefix and whitespace", async () => {
    const output: string[] = [];
    const result = await createDefaultProcessRunner()({
      command: process.execPath,
      args: [
        "-e",
        `process.stdout.write('TOKEN=\\n'); process.stdout.write(' '.repeat(${MAX_CAPTURED_OUTPUT_BYTES + 1})); process.stdout.write('\\nfictional-secret\\n');`,
      ],
      cwd: process.cwd(),
      onOutput(event) {
        output.push(event.text);
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputTruncated).toBe(true);
    expect(output.join("")).toBe(
      "[output record omitted: exceeds byte limit; streaming suppressed]\n",
    );
    expect(output.join("")).not.toContain("fictional-secret");
    expect(result.stdout).toContain("fictional-secret"); // bounded raw capture remains available to its trusted caller
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
  it("resolves pnpm from PNPM_HOME when its launcher directory is not on Path", () => {
    const launch = resolveWindowsLaunch(
      "pnpm",
      ["install"],
      { PNPM_HOME: "C:\\pnpm", PATHEXT: ".CMD" },
      (filePath) => filePath === "C:\\pnpm\\pnpm.cmd",
    );

    expect(launch).toEqual({
      command: "cmd.exe",
      args: ["/d", "/v:off", "/c", "C:\\pnpm\\pnpm.cmd", "install"],
    });
  });

  it("resolves shims from Windows' standard Path environment key", () => {
    const launch = resolveWindowsLaunch(
      "pnpm",
      ["--version"],
      { Path: "C:\\tools", PATHEXT: ".CMD" },
      (filePath) => filePath === "C:\\tools\\pnpm.cmd",
    );

    expect(launch).toEqual({
      command: "cmd.exe",
      args: ["/d", "/v:off", "/c", "C:\\tools\\pnpm.cmd", "--version"],
    });
  });

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
  it("prefers the activated environment's python ahead of the platform launcher", async () => {
    vi.stubEnv("VIRTUAL_ENV", "/example/environment");
    try {
      const runs: string[] = [];
      const resolver = createDefaultExecutableResolver(async (request) => {
        runs.push(request.command);
        return { exitCode: 0, stdout: "Python 3.13.0", stderr: "" };
      });
      expect(await resolver("python")).toBe("python");
      expect(runs).toEqual(["python"]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

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
