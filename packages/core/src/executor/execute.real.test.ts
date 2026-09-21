import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { executeInstallation } from "./execute.js";

const tempDirs: string[] = [];

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
