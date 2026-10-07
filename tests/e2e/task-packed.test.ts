import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { taskByteHash, DEFAULT_HANDOFF_PREFERENCES } from "../../packages/core/dist/index.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import { inventory, workspaceRoot } from "../tasks/fixture-tools.js";
import { portableFixture } from "../tasks/portable-fixture.js";
import { matrix, selectionFor, tokenFor } from "./selection-matrix.js";

let root: string;
let bin: string;
let artifactHash: string;
let aliases: Record<string, string>;
let sourceSha: string;
let sourceDirty: boolean;
let packedPassed = false;
let passedCases = 0;
const runner = createDefaultProcessRunner();
const env = { PATH: process.env.PATH ?? "", LANG: "C", LC_ALL: "C", TZ: "UTC", CI: "1" };
const execute = async (command: string, args: string[], cwd: string, emptyPath = false) => {
  const result = await runner({
    command,
    args,
    cwd,
    env: emptyPath ? { ...env, PATH: "" } : env,
    timeoutMs: 30000,
  });
  expect(Boolean(result.timedOut || result.aborted || result.outputTruncated)).toBe(false);
  return result;
};
beforeAll(async () => {
  sourceSha = (await execute("git", ["rev-parse", "HEAD"], workspaceRoot)).stdout.trim();
  sourceDirty =
    (await execute("git", ["status", "--porcelain"], workspaceRoot)).stdout.trim().length > 0;
  root = await mkdtemp(path.join(tmpdir(), "reposetup-i-pack-"));
  const artifacts = path.join(root, "artifacts");
  await mkdir(artifacts);
  const packed = await execute(
    "pnpm",
    ["--filter", "rsetup", "pack", "--pack-destination", artifacts],
    workspaceRoot,
  );
  expect(packed.exitCode, packed.stderr).toBe(0);
  const files = (await readdir(artifacts)).filter((f) => f.endsWith(".tgz"));
  expect(files).toHaveLength(1);
  const tarball = path.join(artifacts, files[0]!);
  artifactHash = taskByteHash(await readFile(tarball));
  const unpacked = path.join(root, "unpacked");
  await mkdir(unpacked);
  expect((await execute("tar", ["-xzf", tarball, "-C", unpacked], root)).exitCode).toBe(0);
  const packageRoot = path.join(unpacked, "package"),
    manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  const original = JSON.parse(
    await readFile(path.join(workspaceRoot, "packages/cli/package.json"), "utf8"),
  );
  expect(manifest).toMatchObject({
    name: "rsetup",
    version: original.version,
    bin: { rsetup: "./dist/bin.js", reposetup: "./dist/bin.js" },
  });
  // Offline dependency hydration from the already installed frozen workspace. No npm install/lifecycle.
  await symlink(
    path.join(workspaceRoot, "packages/cli/node_modules"),
    path.join(packageRoot, "node_modules"),
    "dir",
  );
  bin = path.join(packageRoot, "dist/bin.js");
  await mkdir(path.join(root, "aliases"));
  aliases = {};
  for (const [alias, relative] of Object.entries(manifest.bin)) {
    const entry = path.join(root, "aliases", alias);
    await symlink(path.join(packageRoot, relative as string), entry);
    aliases[alias] = entry;
  }
});
afterEach((context) => {
  if (context.task.result?.state === "pass") passedCases++;
  packedPassed = passedCases === 4;
});
afterAll(async () => {
  if (packedPassed)
    process.stdout.write(
      JSON.stringify({
        kind: "task_packed_offline_contract",
        schemaVersion: 1,
        qualification: false,
        scope:
          "Extracted tarball with preinstalled dependency hydration; Node-invoked aliases and zero-effect dry-run only.",
        sourceSha,
        sourceDirty,
        artifactHash,
        lockfileHash: taskByteHash(await readFile(path.join(workspaceRoot, "pnpm-lock.yaml"))),
        host: { platform: process.platform, architecture: process.arch, node: process.version },
      }) + "\n",
    );
  if (root) await rm(root, { recursive: true, force: true });
});
const cli = (args: string[], cwd: string, entry = bin) =>
  execute(process.execPath, [entry, ...args], cwd, true);
describe("offline extracted packed task and legacy contracts", () => {
  it("executes both declared bin targets with no project tools or credentials", async () => {
    expect(artifactHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    for (const alias of ["rsetup", "reposetup"]) {
      const result = await cli(["--help"], root, aliases[alias]);
      expect(result.exitCode, result.stderr).toBe(0);
      expect(result.stdout).toContain("task");
      expect(result.stdout).toContain("create");
    }
  });
  it("compiles, hands off and inspects the hostile-text fixture without project effects", async () => {
    const f = await portableFixture(path.join(root, "portable"));
    const before = await inventory(f.project);
    const common = ["--review", f.reviewPath];
    const compiled = await cli(
      ["--json", "task", "compile", ...common, "--draft", f.draftPath],
      f.project,
    );
    expect(compiled.exitCode, compiled.stdout + compiled.stderr).toBe(0);
    const receipt = JSON.parse(compiled.stdout);
    expect(receipt).toMatchObject({ kind: "task_compilation", baselineGit: "not_checked" });
    await writeFile(f.planPath, compiled.stdout);
    for (const mode of ["next", "status"]) {
      const args = ["--json", "task", mode, ...common, "--plan", f.planPath];
      if (mode === "next")
        args.push("--run-id", "123e4567-e89b-42d3-a456-426614174000", "--attempt", "1");
      const live = await cli(args, f.project);
      expect(live.exitCode, live.stdout + live.stderr).toBe(0);
      expect(live.stdout + live.stderr).not.toContain("PRIVATE_DENIED_MARKER");
      if (mode === "next") {
        const handoff = JSON.parse(live.stdout);
        expect(handoff.handoff.enforcement.scope).toBe("advisory");
        expect(handoff.handoff.recommendedRouting).toBeNull();
      }
      const dry = await cli([...args, "--dry-run"], f.project);
      expect(dry.exitCode, dry.stdout + dry.stderr).toBe(0);
      expect(JSON.parse(dry.stdout).dryRun).toBe(true);
      expect(dry.stdout).not.toContain("Untrusted fixture text");
    }
    const preferencesPath = path.join(root, "portable", "managed-preferences.json");
    await writeFile(
      preferencesPath,
      JSON.stringify({
        ...DEFAULT_HANDOFF_PREFERENCES,
        executionMode: "managed",
        providerAvailability: [
          { providerId: "openai-responses-v1", enabled: true, modelProfileIds: ["gpt-6.1-sol"] },
        ],
        effortPreference: { type: "explicit", nativeEffortId: "low" },
      }),
    );
    await mkdir(path.join(root, "private-state"), { mode: 0o700 });
    const stateRoot = await realpath(path.join(root, "private-state"));
    const managed = await cli(
      [
        "--json",
        "task",
        "compile",
        "--managed",
        "--preferences",
        preferencesPath,
        "--effort",
        "low",
        ...common,
        "--state-root",
        stateRoot,
        "--dry-run",
      ],
      f.project,
    );
    expect(managed.exitCode, managed.stdout + managed.stderr).toBe(0);
    const managedPreview = JSON.parse(managed.stdout);
    expect(managedPreview.dryRun).toBe(true);
    const managedArgs = [
      "--json",
      "task",
      "compile",
      "--managed",
      ...common,
      "--preferences",
      preferencesPath,
      "--effort",
      "low",
      "--state-root",
      stateRoot,
    ];
    const noAllowance = await cli(managedArgs, f.project);
    expect(JSON.parse(noAllowance.stdout).error.code).toBe("TASK_PROVIDER_ALLOWANCE_REQUIRED");
    const missingKey = await cli(
      [...managedArgs, "--allow-provider-usage", "--approve-compilation", managedPreview.summaryId],
      f.project,
    );
    expect(missingKey.exitCode, missingKey.stdout + missingKey.stderr).toBe(4);
    expect(JSON.parse(missingKey.stdout).error.code).toBe("TASK_PROVIDER_CREDENTIAL_MISSING");
    expect(await inventory(f.project)).toEqual(before);
    expect(await readdir(stateRoot)).toEqual([]);
  });
  it("rejects executable and broader/traversal drafts before any project effects", async () => {
    const f = await portableFixture(path.join(root, "invalid")),
      before = await inventory(f.project);
    const invalids = [
      { ...f.draft, command: "PRIVATE_PAYLOAD_MARKER curl forbidden" },
      ...[["../escape.ts"], ["README.md"]].map((write) => ({
        ...f.draft,
        tasks: f.draft.tasks.map((t) => ({ ...t, scope: { ...t.scope, write } })),
      })),
    ];
    for (const draft of invalids) {
      await writeFile(f.draftPath, JSON.stringify(draft));
      const result = await cli(
        ["--json", "task", "compile", "--review", f.reviewPath, "--draft", f.draftPath],
        f.project,
      );
      expect(result.exitCode).not.toBe(0);
      expect(JSON.parse(result.stdout).error.code).toMatch(/^TASK_/);
      expect(result.stdout + result.stderr).not.toContain("PRIVATE_PAYLOAD_MARKER");
    }
    expect(await inventory(f.project)).toEqual(before);
  });
  it("preserves preset, stack-config and selection-token/file create dry-runs", async () => {
    const cwd = path.join(root, "legacy");
    await mkdir(cwd);
    const context = matrix.contexts.find((c) => c.context.frameworkId === "react-vite")!,
      selection = selectionFor(context, [], "create");
    if (selection.mode !== "create") throw new Error("create fixture");
    const configFile = path.join(cwd, "stack.json"),
      selectionFile = path.join(cwd, "selection.json");
    await writeFile(configFile, JSON.stringify(selection.config));
    await writeFile(selectionFile, JSON.stringify(selection));
    const before = await inventory(cwd);
    for (const route of [
      ["--preset", "react-vite"],
      ["--config", configFile],
      ["--selection", tokenFor(selection)],
      ["--selection-file", selectionFile],
    ]) {
      const result = await cli(["--json", "create", ...route, "--dry-run"], cwd);
      expect(result.exitCode, result.stdout + result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        kind: "plan",
        dryRun: true,
        plan: { valid: true, errors: [] },
      });
    }
    expect(await inventory(cwd)).toEqual(before);
  });
});
