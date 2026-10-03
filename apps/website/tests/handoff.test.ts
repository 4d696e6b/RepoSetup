import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeAll, expect, it } from "vitest";
import { catalog, handoff } from "../src/catalog.js";
import { chooseSelection, exportSelection } from "../src/selection.js";
import { verifyArtifact } from "../scripts/verify-artifact.ts";

const local = resolve(".local-cli");
const bin = join(local, "installed/node_modules/rsetup/dist/bin.js");
const roots: string[] = [];
beforeAll(async () => {
  // Required evidence, never a hidden skip. Build the pinned artifact first.
  const evidence = JSON.parse(await readFile(join(local, "evidence.json"), "utf8"));
  expect(evidence.commit).toBe(handoff.commit);
  expect(evidence.version).toBe(handoff.version);
  verifyArtifact(local);
  expect(
    Number(process.versions.node.split(".")[0]),
    "Run packed handoff tests with Node 24",
  ).toBeGreaterThanOrEqual(24);
});
afterEach(async () => {
  await Promise.all(roots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function workspace() {
  const cwd = await mkdtemp(join(tmpdir(), "reposetup-site-export-"));
  roots.push(cwd);
  return cwd;
}
function run(
  command: string,
  args: string[],
  cwd: string,
  env = process.env,
): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "",
      err = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Packed CLI timed out"));
    }, 20000);
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code: code ?? 1, out, err });
    });
  });
}
async function seed(cwd: string, framework: string) {
  if (framework === "fastapi") {
    await writeFile(
      join(cwd, "pyproject.toml"),
      '[project]\nname="api"\ndependencies=["fastapi"]\n',
    );
    await writeFile(join(cwd, "uv.lock"), "version = 1\n");
    await writeFile(join(cwd, "main.py"), "from fastapi import FastAPI\napp=FastAPI()\n");
  } else {
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        name: "app",
        dependencies:
          framework === "express" ? { express: "5.0.0" } : { react: "19.0.0", vite: "7.0.0" },
        devDependencies: { typescript: "5.9.3" },
      }),
    );
    await writeFile(join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(join(cwd, "tsconfig.json"), "{}\n");
    if (framework === "react-vite")
      await writeFile(join(cwd, "vite.config.ts"), "export default {}\n");
  }
}
async function snapshot(cwd: string) {
  const result: Record<string, string> = {};
  for (const file of await readdir(cwd)) result[file] = await readFile(join(cwd, file), "utf8");
  return result;
}

it.each(catalog.contexts.map((context) => context.id))(
  "every website %s subset reaches equivalent packed create/add plans",
  async (contextId) => {
    const context = catalog.contexts.find((item) => item.id === contextId)!;
    for (const variant of catalog.variants.filter((item) => item.contextId === contextId)) {
      for (const mode of ["create", "add"] as const) {
        if (mode === "add" && !variant.add) continue;
        const cwd = await workspace();
        if (mode === "add") await seed(cwd, context.context.frameworkId);
        const selection = chooseSelection(catalog, {
          contextId,
          mode,
          ids: variant.ids,
          name: "site-test",
          path: "projects/site-test",
        });
        const output = exportSelection(selection, catalog.limits);
        await writeFile(join(cwd, "selection.json"), output.json);
        const before = await snapshot(cwd);
        const token = output.command!.split(" ").at(-1)!;
        const results = [];
        for (const route of [
          ["--selection", token],
          [mode === "create" ? "--selection-file" : "--config", "selection.json"],
        ]) {
          const result = await run(
            process.execPath,
            [bin, "--json", mode, ...route, "--dry-run"],
            cwd,
          );
          expect(result.code, result.err).toBe(0);
          results.push(JSON.parse(result.out));
        }
        expect(results[0]).toEqual(results[1]);
        expect(await snapshot(cwd)).toEqual(before);
      }
    }
  },
  60000,
);

it("a website command launched through POSIX shells shows choices/plan and requires confirmation", async () => {
  const cwd = await workspace();
  const selection = chooseSelection(catalog, {
    contextId: "express-ts-pnpm",
    mode: "create",
    ids: ["zod", "prettier"],
    name: "app",
    path: "app",
  });
  const output = exportSelection(selection, catalog.limits);
  const parts = output.command!.split(" ");
  expect(parts.shift()).toBe("reposetup");
  const env = { ...process.env, PATH: `${join(local, "bin")}:${process.env.PATH}` };
  for (const shell of ["/bin/zsh", "/bin/bash"]) {
    // Fixed shell program; user choices remain separate arguments, never shell source.
    const result = await run(
      shell,
      ["-fc", 'reposetup "$@"', "website-handoff", ...parts],
      cwd,
      env,
    );
    expect(result.out).toContain("Decoded selection");
    expect(result.out).toContain("Operations");
    expect(result.code).toBe(2);
    expect(result.err).toContain("requires interactive confirmation");
  }
  expect(await readdir(cwd)).toEqual([]);
});

it("the actual token boundary and oversized file fallback validate in the packed CLI", async () => {
  const cwd = await workspace();
  const selection = chooseSelection(catalog, {
    contextId: "express-ts-pnpm",
    mode: "create",
    ids: ["zod"],
    name: "app",
    path: "app",
  });
  const json = JSON.stringify(selection);
  const boundary = json + " ".repeat(catalog.limits.tokenBytes - Buffer.byteLength(json));
  const output = exportSelection(selection, catalog.limits, boundary);
  const token = output.command!.split(" ").at(-1)!;
  expect(token).toHaveLength(4096);
  const accepted = await run(
    process.execPath,
    [bin, "create", "--selection", token, "--dry-run"],
    cwd,
  );
  expect(accepted.code, accepted.err).toBe(0);
  const env = { ...process.env, PATH: `${join(local, "bin")}:${process.env.PATH}` };
  for (const shell of ["/bin/zsh", "/bin/bash"]) {
    const transported = await run(
      shell,
      ["-fc", 'reposetup "$@"', "website-boundary", "create", "--selection", token, "--dry-run"],
      cwd,
      env,
    );
    expect(transported.code, transported.err).toBe(0);
  }
  const fallback = exportSelection(selection, catalog.limits, boundary + " ");
  expect(fallback.command).toBeNull();
  await writeFile(join(cwd, "selection.json"), fallback.json);
  const fromFile = await run(
    process.execPath,
    [bin, "create", "--selection-file", "selection.json", "--dry-run"],
    cwd,
  );
  expect(fromFile.code, fromFile.err).toBe(0);
  const refused = await run(
    process.execPath,
    [bin, "create", "--selection", token + "a", "--dry-run"],
    cwd,
  );
  expect(refused.code).toBe(2);
  expect(refused.err).toContain("SELECTION_INVALID");
  expect(await readdir(cwd)).toEqual(["selection.json"]);
});

it("packed CLI rejects stale, hostile, executable and incompatible selections without writes", async () => {
  const cwd = await workspace();
  const selection = catalog.variants[0]!.create;
  if (selection.mode !== "create") throw new Error();
  const inputs = [
    { ...selection, catalogRevision: "stale" },
    { ...selection, command: "touch pwn" },
    { ...selection, config: { ...selection.config, project: { name: "app", path: "../outside" } } },
    {
      ...selection,
      config: {
        ...selection.config,
        integrations: [{ id: "zod", options: { secret: "private" } }],
      },
    },
    { ...selection, config: { ...selection.config, integrations: [{ id: "pytest" }] } },
  ];
  for (const input of inputs) {
    const token = Buffer.from(JSON.stringify(input)).toString("base64url");
    const result = await run(
      process.execPath,
      [bin, "create", "--selection", token, "--dry-run"],
      cwd,
    );
    expect(result.code).toBe(2);
    expect(result.err).toContain("SELECTION_INVALID");
  }
  expect(await readdir(cwd)).toEqual([]);
  await seed(cwd, "express");
  const before = await snapshot(cwd);
  const add = catalog.variants.find(
    (v) => v.contextId === "fastapi-uv" && v.ids.includes("pytest"),
  )!.add!;
  const result = await run(
    process.execPath,
    [
      bin,
      "add",
      "--selection",
      exportSelection(add, catalog.limits).command!.split(" ").at(-1)!,
      "--dry-run",
    ],
    cwd,
  );
  expect(result.code).toBe(3);
  expect(result.err).toContain("UNSUPPORTED_CONTEXT");
  expect(await snapshot(cwd)).toEqual(before);
});
