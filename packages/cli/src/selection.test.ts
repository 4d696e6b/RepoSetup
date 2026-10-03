import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  encodeSelection,
  type DeclarativeSelection,
  type ProcessRunRequest,
} from "@reposetup/core";
import { BEGINNER_CATALOG } from "@reposetup/integrations";
import { runCli } from "./run-cli.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function root() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "reposetup-selection-"));
  roots.push(dir);
  return dir;
}
function capture() {
  let out = "",
    err = "";
  return {
    io: {
      writeOut: (text: string) => {
        out += text;
      },
      writeErr: (text: string) => {
        err += text;
      },
    },
    out: () => out,
    err: () => err,
  };
}
const common = {
  selectionVersion: 1 as const,
  catalogRevision: BEGINNER_CATALOG.revision,
  cliContract: "selection-v1" as const,
};
function createSelection(index = 0): DeclarativeSelection {
  return {
    ...common,
    mode: "create",
    config: structuredClone(BEGINNER_CATALOG.presets[index]!.config),
  };
}
function addSelection(index = 0): Extract<DeclarativeSelection, { mode: "add" }> {
  const context = BEGINNER_CATALOG.contexts[index]!.context;
  return {
    ...common,
    mode: "add",
    context,
    integrations: [{ id: context.runtimeId === "python" ? "pydantic" : "zod", options: {} }],
  };
}
async function app(dir: string, index = 0) {
  if (index === 2) {
    await writeFile(
      path.join(dir, "pyproject.toml"),
      '[project]\nname = "api"\ndependencies = ["fastapi"]\n',
    );
    await writeFile(path.join(dir, "uv.lock"), "version = 1\n");
    await writeFile(path.join(dir, "main.py"), "from fastapi import FastAPI\napp = FastAPI()\n");
  } else {
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "app",
        scripts: { test: "custom-test" },
        dependencies: index === 0 ? { react: "19.0.0", vite: "7.0.0" } : { express: "5.0.0" },
        devDependencies: { typescript: "5.9.3" },
      }),
    );
    await writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(dir, "tsconfig.json"), "{}\n");
    if (index === 0) await writeFile(path.join(dir, "vite.config.ts"), "export default {}\n");
  }
}
async function snapshot(dir: string): Promise<string[]> {
  const paths = await readdir(dir, { recursive: true, withFileTypes: true });
  return Promise.all(
    paths
      .filter((item) => item.isFile())
      .map(
        async (item) =>
          `${item.name}:${await readFile(path.join(item.parentPath, item.name), "utf8")}`,
      ),
  );
}

describe("CLI selection handoff", () => {
  it.each([0, 1, 2])(
    "dry-runs create token/file equivalently and preserves legacy config behavior (%s)",
    async (index) => {
      const dir = await root();
      const selection = createSelection(index);
      if (selection.mode !== "create") throw new Error();
      await writeFile(path.join(dir, "selection.json"), JSON.stringify(selection));
      await writeFile(path.join(dir, "config.json"), JSON.stringify(selection.config));
      const before = await snapshot(dir);
      const runProcess = vi.fn(async () => {
        throw new Error("dry-run must not spawn");
      });
      const plans: unknown[] = [];
      for (const args of [
        ["--selection", encodeSelection(selection)],
        ["--selection-file", "selection.json"],
        ["--config", "config.json"],
      ]) {
        const io = capture();
        const result = await runCli(["--json", "create", ...args, "--dry-run"], {
          cwd: dir,
          io: io.io,
          runProcess,
        });
        expect(result.exitCode, io.err()).toBe(0);
        plans.push(JSON.parse(io.out()));
      }
      expect(plans[0]).toEqual(plans[1]);
      expect(plans[2]).toMatchObject({ version: 1, kind: "plan", plan: { valid: true } });
      expect(await snapshot(dir)).toEqual(before);
      expect(runProcess).not.toHaveBeenCalled();
    },
  );
  it.each([0, 1, 2])(
    "dry-runs add token/file equivalently using actual detected context (%s)",
    async (index) => {
      const dir = await root();
      await app(dir, index);
      const selection = addSelection(index);
      await writeFile(path.join(dir, "selection.json"), JSON.stringify(selection));
      const before = await snapshot(dir);
      const outputs = [];
      for (const args of [
        ["--selection", encodeSelection(selection)],
        ["--config", "selection.json"],
      ]) {
        const io = capture();
        const result = await runCli(["--json", "add", ...args, "--dry-run"], {
          cwd: dir,
          io: io.io,
          runProcess: async () => {
            throw new Error("dry-run spawned");
          },
        });
        expect(result.exitCode, io.err()).toBe(0);
        outputs.push(JSON.parse(io.out()));
        expect(io.err()).toContain("Decoded selection");
      }
      expect(outputs[0]).toEqual(outputs[1]);
      expect(await snapshot(dir)).toEqual(before);
    },
  );
  it("prints decoded choices and full plan before confirmation, then stops safely on refusal", async () => {
    const dir = await root();
    const io = capture();
    const confirm = vi.fn(async () => {
      expect(io.out()).toContain("Decoded selection");
      expect(io.out()).toContain("react-vite");
      expect(io.out()).toContain("Operations");
      return false;
    });
    const runProcess = vi.fn(async () => {
      throw new Error("refusal must not execute");
    });
    const result = await runCli(
      ["create", "--selection", encodeSelection(createSelection()), "--quiet"],
      { cwd: dir, io: io.io, confirmCreate: confirm, runProcess },
    );
    expect(result.exitCode).toBe(2);
    expect(confirm).toHaveBeenCalledOnce();
    expect(runProcess).not.toHaveBeenCalled();
    expect(await readdir(dir)).toEqual([]);
  });
  it("rejects flag/mode conflicts and malformed input with versioned JSON errors before reads/writes", async () => {
    const dir = await root();
    const token = encodeSelection(createSelection());
    const add = encodeSelection(addSelection());
    const cases = [
      ["create", "--selection", token, "--yes"],
      ["create", "override", "--selection", token],
      ["create", "--selection", token, "--config", "absent.json"],
      ["create", "--selection", token, "--preset", "react-vite"],
      ["create", "--config", "absent.json", "--preset", "react-vite"],
      ["create", "--selection", token, "--framework", "express"],
      ["create", "--selection", token, "--typescript"],
      ["create", "--selection", token, "--package-manager", "npm"],
      ["create", "--selection", add],
      ["add", "zod", "--selection", add],
      ["add", "--selection", add, "--config", "absent.json"],
      ["add", "--selection", add, "--yes"],
      ["add", "--selection", add, "--package-manager", "pnpm"],
      ["add", "--selection", token],
      ["create", "--selection", "%%%"],
      ["add", "--selection", "a".repeat(4097)],
    ];
    const readFile = vi.fn(async () => {
      throw new Error("conflicts must not read files");
    });
    for (const args of cases) {
      const io = capture();
      const result = await runCli(["--json", ...args, "--dry-run"], {
        cwd: dir,
        io: io.io,
        fs: { readFile },
      });
      expect(result.exitCode, io.err()).toBe(2);
      expect(JSON.parse(io.err())).toMatchObject({
        version: 1,
        kind: "error",
        error: { code: "SELECTION_INVALID" },
      });
    }
    expect(readFile).not.toHaveBeenCalled();
    expect(await readdir(dir)).toEqual([]);
  });
  it("bounds actual file reads and refuses invalid UTF-8 files", async () => {
    const dir = await root();
    for (const content of [Buffer.alloc(16385, 32), Buffer.from([0xc0, 0xaf])]) {
      await writeFile(path.join(dir, "selection.json"), content);
      const io = capture();
      expect(
        (
          await runCli(["--json", "add", "--config", "selection.json", "--dry-run"], {
            cwd: dir,
            io: io.io,
          })
        ).exitCode,
      ).toBe(2);
      expect(JSON.parse(io.err()).error.code).toBe("SELECTION_INVALID");
    }
  });
  it("rejects incompatible actual frameworks, language and managers before confirmation", async () => {
    const dir = await root();
    await app(dir, 1);
    const before = await snapshot(dir);
    for (const selection of [
      addSelection(0),
      { ...addSelection(1), context: { ...addSelection(1).context, typescript: false } },
    ]) {
      const io = capture();
      const confirmCreate = vi.fn(async () => true);
      expect(
        (
          await runCli(["add", "--selection", encodeSelection(selection)], {
            cwd: dir,
            io: io.io,
            confirmCreate,
          })
        ).exitCode,
      ).not.toBe(0);
      expect(confirmCreate).not.toHaveBeenCalled();
    }
    await writeFile(path.join(dir, "pnpm-lock.yaml"), "");
    await writeFile(path.join(dir, "package-lock.json"), "{}");
    const io = capture();
    expect(
      (
        await runCli(["add", "--selection", encodeSelection(addSelection(1)), "--dry-run"], {
          cwd: dir,
          io: io.io,
        })
      ).exitCode,
    ).not.toBe(0);
    await rm(path.join(dir, "package-lock.json"));
    await writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    expect(await snapshot(dir)).toEqual(before);
  });
  it("executes confirmed add, preserves user files/custom versions, and makes repeated application a no-op", async () => {
    const dir = await root();
    await app(dir, 1);
    await writeFile(path.join(dir, ".prettierrc"), '{"custom":true}\n');
    await writeFile(path.join(dir, ".env"), "PRIVATE_TOKEN=do-not-print\n");
    const selection = addSelection(1);
    selection.integrations = [{ id: "prettier", options: {} }, { id: "zod" }];
    const runs: ProcessRunRequest[] = [];
    const io = capture();
    const confirmCreate = vi.fn(async () => {
      expect(io.out()).toContain("Decoded selection");
      return true;
    });
    const result = await runCli(["add", "--selection", encodeSelection(selection)], {
      cwd: dir,
      io: io.io,
      confirmCreate,
      commandExists: async () => true,
      resolveExecutable: async (command) => command,
      runProcess: async (request) => {
        runs.push(request);
        if (request.args.includes("install")) {
          const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
          pkg.dependencies.zod = "4.0.0-user-pin";
          pkg.devDependencies.prettier = "3.0.0-user-pin";
          await writeFile(path.join(dir, "package.json"), JSON.stringify(pkg));
        }
        return {
          exitCode: 0,
          stdout: request.args.includes("--version") ? "24.0.0\n" : "",
          stderr: "",
        };
      },
    });
    expect(result.exitCode, io.err()).toBe(0);
    expect(confirmCreate).toHaveBeenCalledOnce();
    expect(runs.some((request) => request.args.includes("install"))).toBe(true);
    expect(await readFile(path.join(dir, ".prettierrc"), "utf8")).toBe('{"custom":true}\n');
    expect(io.out() + io.err()).not.toContain("do-not-print");
    const before = await snapshot(dir);
    const second = capture();
    const runProcess = vi.fn(async () => {
      throw new Error("repeat must not spawn");
    });
    expect(
      (
        await runCli(["--json", "add", "--selection", encodeSelection(selection)], {
          cwd: dir,
          io: second.io,
          runProcess,
        })
      ).exitCode,
      second.err(),
    ).toBe(0);
    expect(JSON.parse(second.out()).plan.operations).toEqual([]);
    expect(runProcess).not.toHaveBeenCalled();
    expect(await snapshot(dir)).toEqual(before);
  });
});

it("revalidates selection add after confirmation and refuses a changed local plan", async () => {
  const dir = await root();
  await app(dir, 1);
  const selection = addSelection(1);
  selection.integrations = [{ id: "prettier" }];
  const io = capture();
  const runProcess = vi.fn(async () => {
    throw new Error("stale plan must not spawn");
  });
  const result = await runCli(["add", "--selection", encodeSelection(selection)], {
    cwd: dir,
    io: io.io,
    runProcess,
    confirmCreate: async () => {
      await writeFile(path.join(dir, ".prettierrc"), "user edit during review\n");
      return true;
    },
  });
  expect(result.exitCode).toBe(2);
  expect(io.err()).toContain("changed during confirmation");
  expect(runProcess).not.toHaveBeenCalled();
  expect(await readFile(path.join(dir, ".prettierrc"), "utf8")).toBe("user edit during review\n");
});

it("refuses repeated create on an existing directory and preserves all user files", async () => {
  const dir = await root();
  const selection = createSelection(1);
  if (selection.mode !== "create") throw new Error();
  selection.config.project.path = "occupied";
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(dir, "occupied"));
  await writeFile(path.join(dir, "occupied", "package.json"), '{"user":true}\n');
  const before = await snapshot(dir);
  const io = capture();
  const result = await runCli(["create", "--selection", encodeSelection(selection)], {
    cwd: dir,
    io: io.io,
    confirmCreate: async () => true,
    commandExists: async () => true,
    resolveExecutable: async (command) => command,
    runProcess: async () => ({ exitCode: 0, stdout: "24.0.0\n", stderr: "" }),
  });
  expect(result.exitCode).not.toBe(0);
  expect(io.err()).toContain("FILE_ALREADY_EXISTS");
  expect(await snapshot(dir)).toEqual(before);
});

it.each([0, 1, 2])(
  "a satisfied selection is a no-op for each bounded context (%s)",
  async (index) => {
    const dir = await root();
    await app(dir, index);
    const selection = addSelection(index);
    if (index === 2)
      await writeFile(
        path.join(dir, "pyproject.toml"),
        '[project]\nname = "api"\ndependencies = ["fastapi", "pydantic==2.0.0"]\n',
      );
    else {
      const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
      pkg.dependencies.zod = "custom-version";
      await writeFile(path.join(dir, "package.json"), JSON.stringify(pkg));
    }
    const before = await snapshot(dir);
    const io = capture();
    const runProcess = vi.fn(async () => {
      throw new Error("no-op must not spawn");
    });
    expect(
      (
        await runCli(["add", "--selection", encodeSelection(selection)], {
          cwd: dir,
          io: io.io,
          runProcess,
        })
      ).exitCode,
      io.err(),
    ).toBe(0);
    expect(io.out()).toContain("No changes");
    expect(runProcess).not.toHaveBeenCalled();
    expect(await snapshot(dir)).toEqual(before);
  },
);
