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
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { executeInstallation as executeCoreInstallation } from "./execute.js";
import type { ExecuteOptions, ExecutorFileSystem, ProcessRunner } from "./types.js";

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

const testProcessRunner: ProcessRunner = (request) =>
  new Promise((resolve, reject) => {
    const child = spawn(request.command, [...request.args], {
      cwd: request.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
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

function executeInstallation(
  operations: Parameters<typeof executeCoreInstallation>[0],
  options: Omit<ExecuteOptions, "fs" | "runProcess">,
) {
  return executeCoreInstallation(operations, {
    ...options,
    fs: testFileSystem,
    runProcess: testProcessRunner,
  });
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("executeInstallation real processes", () => {
  it("mutates files and runs a local Node command without a shell", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-exec-real-"));
    tempDirs.push(root);

    const result = await executeInstallation(
      [
        {
          type: "check_prerequisite",
          id: "node",
          description: "Require Node.js",
        },
        {
          type: "create_directory",
          path: "src",
          behavior: "fail_if_exists",
          description: "Create src",
        },
        {
          type: "create_file",
          path: "src/hello.txt",
          content: "hello\n",
          behavior: "fail_if_exists",
          description: "Write hello",
        },
        {
          type: "create_file",
          path: "package.json",
          content: "{}\n",
          behavior: "fail_if_exists",
          description: "Write package.json",
        },
        {
          type: "modify_json",
          path: "package.json",
          merge: { name: "demo" },
          behavior: "merge",
          description: "Set package name",
        },
        {
          type: "add_env_example",
          path: ".env.example",
          entries: [{ key: "DEMO", placeholder: "1" }],
          description: "Add DEMO placeholder",
        },
        {
          type: "run_command",
          command: "node",
          args: ["-e", "require('node:fs').writeFileSync('ran.txt', 'ok\\n')"],
          cwd: ".",
          description: "Write a marker with Node",
        },
        {
          type: "show_message",
          message: "Real execution finished.",
          description: "Note completion",
        },
      ],
      { rootDir: root },
    );

    expect(result.ok).toBe(true);
    expect(await readFile(path.join(root, "src/hello.txt"), "utf8")).toBe("hello\n");
    expect(JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))).toEqual({
      name: "demo",
    });
    expect(await readFile(path.join(root, ".env.example"), "utf8")).toBe("DEMO=1\n");
    expect(await readFile(path.join(root, "ran.txt"), "utf8")).toBe("ok\n");
  });
});
