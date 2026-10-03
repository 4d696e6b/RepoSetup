import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { release, version } from "node:os";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  cleanupWorkspace,
  createTempWorkspace,
  keepOnFailure,
  runProcess,
  snapshotTree,
  writeJson,
} from "./harness.js";
import { prepareSelectionArtifact, sha256 } from "./selection-artifact.js";
import { matrix, matrixPath, selectionFor } from "./selection-matrix.js";

const presetIds = ["next-sqlite", "react-vite", "express-postgres", "fastapi", "flask"] as const;
interface CaseEvidence {
  id: string;
  passed: boolean;
  lockSha256?: string;
  failure?: string;
}
let root: string;
let evidenceDir: string;
let artifact: Awaited<ReturnType<typeof prepareSelectionArtifact>> | undefined;
let env: NodeJS.ProcessEnv;
let pythonVersion = "";
let uvVersion = "";
let setupFailure: string | undefined;
const cases: CaseEvidence[] = [];

beforeAll(async () => {
  root = await createTempWorkspace("reposetup-selection-legacy-");
  evidenceDir = process.env.REPOSETUP_SELECTION_LEGACY_EVIDENCE_DIR ?? path.join(root, "evidence");
  await mkdir(evidenceDir);
  try {
    expect(Number(process.versions.node.split(".")[0])).toBe(matrix.runtimes.nodeMajor);
    const python = process.env.UV_PYTHON ?? (process.platform === "win32" ? "python" : "python3");
    const resolved = await runProcess(
      python,
      ["-c", "import sys; print(sys.executable); print(sys.version.split()[0])"],
      { cwd: root },
    );
    expect(resolved.exitCode, resolved.stderr).toBe(0);
    const [executable, version] = resolved.stdout.trim().split(/\r?\n/);
    pythonVersion = version ?? "";
    expect(matrix.runtimes.python).toContain(pythonVersion.split(".").slice(0, 2).join("."));
    if (process.env.REPOSETUP_SELECTION_PYTHON_TARGET !== undefined)
      expect(pythonVersion.split(".").slice(0, 2).join(".")).toBe(
        process.env.REPOSETUP_SELECTION_PYTHON_TARGET,
      );
    env = {
      ...process.env,
      UV_PYTHON: executable!,
      UV_PYTHON_DOWNLOADS: "never",
      UV_CACHE_DIR: path.join(root, "uv-cache"),
    };
    const uv = await runProcess("uv", ["--version"], { cwd: root, env });
    expect(uv.exitCode, uv.stderr).toBe(0);
    uvVersion = uv.stdout.trim();
    expect(uvVersion.split(" ")[1]).toBe(matrix.runtimes.uv);
    artifact = await prepareSelectionArtifact(root);
    expect(artifact.tools.pnpm).toBe(matrix.runtimes.pnpm);
  } catch (error) {
    setupFailure = error instanceof Error ? error.message : String(error);
    throw error;
  }
});

afterAll(async () => {
  if (evidenceDir === undefined) return;
  await writeFile(
    path.join(evidenceDir, "report.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        kind: "selection-packed-legacy",
        releaseQualification: false,
        allCasesPassed:
          cases.length === matrix.contexts.length + presetIds.length + 1 &&
          cases.every((item) => item.passed),
        expectedCases: matrix.contexts.length + presetIds.length + 1,
        platform: process.platform,
        architecture: process.arch,
        operatingSystem: { release: release(), version: version() },
        runtime: {
          node: process.version,
          python: pythonVersion,
          uv: uvVersion,
          ...artifact?.tools,
        },
        matrixRevision: matrix.revision,
        matrixSha256: sha256(await readFile(matrixPath)),
        artifact: artifact?.identity,
        sourceDirty: artifact?.sourceDirty,
        externalArtifact: artifact?.externalArtifact,
        setupFailure,
        cases,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  await cleanupWorkspace(root, keepOnFailure());
});

it.each(matrix.contexts)(
  "retains schemaVersion 1 create, positional add and JSON for $id",
  async (context) => {
    if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
    const item: CaseEvidence = { id: "config-add/" + context.id, passed: false };
    cases.push(item);
    const parent = path.join(root, "legacy " + context.id + " space ไทย");
    const project = path.join(parent, "project");
    await mkdir(project, { recursive: true });
    const configFile = path.join(parent, "legacy-config.json");
    const selected = selectionFor(context, [], "create");
    if (selected.mode !== "create") throw new Error("Expected create selection");
    const config = { ...selected.config, project: { name: "legacy-app" } };
    await writeJson(configFile, config);
    const bin = artifact.bin;
    const run = (args: string[], cwd = project) =>
      runProcess(process.execPath, [bin, "--json", ...args], { cwd, env });
    try {
      const before = await snapshotTree(project);
      const invalid = await runProcess(
        process.execPath,
        [
          artifact.bin,
          "--json",
          "create",
          "--config",
          path.join(parent, "invalid.json"),
          "--dry-run",
        ],
        { cwd: project, env },
      );
      expect(invalid.exitCode).not.toBe(0);
      expect(JSON.parse(invalid.stderr.trim().split(/\r?\n/).at(-1)!)).toMatchObject({
        version: 1,
        kind: "error",
      });
      const dry = await run(["create", "--config", configFile, "--dry-run"]);
      expect(dry.exitCode, dry.stderr).toBe(0);
      const dryPlan = JSON.parse(dry.stdout);
      expect(dryPlan).toMatchObject({
        version: 1,
        kind: "plan",
        dryRun: true,
        plan: { valid: true, config: { schemaVersion: 1 } },
      });
      expect(await snapshotTree(project)).toEqual(before);
      const created = await run(["create", "--config", configFile, "--yes"]);
      expect(created.exitCode, created.stderr).toBe(0);
      expect(JSON.parse(created.stdout.split(/\r?\n/)[0]!)).toMatchObject({
        version: 1,
        kind: "plan",
        dryRun: false,
      });
      const lockName = context.context.runtimeId === "node" ? "pnpm-lock.yaml" : "uv.lock";
      const firstLock = await readFile(path.join(project, lockName));
      expect(firstLock.length).toBeGreaterThan(100);
      const readme = await readFile(path.join(project, "README.md"));
      await writeFile(path.join(project, "user-notes.txt"), "Keep this user file.\n");
      const id = context.context.runtimeId === "node" ? "vitest" : "pytest";
      const addDry = await run(["add", id, "--dry-run"]);
      expect(addDry.exitCode, addDry.stderr).toBe(0);
      expect(JSON.parse(addDry.stdout)).toMatchObject({ version: 1, kind: "plan", dryRun: true });
      expect(await readFile(path.join(project, lockName))).toEqual(firstLock);
      const added = await run(["add", id, "--yes"]);
      expect(added.exitCode, added.stderr).toBe(0);
      expect(JSON.parse(added.stdout.split(/\r?\n/)[0]!)).toMatchObject({
        version: 1,
        kind: "plan",
        dryRun: false,
      });
      const finalLock = await readFile(path.join(project, lockName));
      expect(finalLock).not.toEqual(firstLock);
      item.lockSha256 = sha256(finalLock);
      await writeFile(path.join(evidenceDir, "legacy-" + context.id + "-" + lockName), finalLock);
      expect(await readFile(path.join(project, "README.md"))).toEqual(readme);
      expect(await readFile(path.join(project, "user-notes.txt"), "utf8")).toBe(
        "Keep this user file.\n",
      );
      const check =
        context.context.runtimeId === "node"
          ? await runProcess("pnpm", ["exec", "vitest", "run"], { cwd: project, env })
          : await runProcess("uv", ["run", "--frozen", "pytest"], { cwd: project, env });
      expect(check.exitCode, check.stderr + "\n" + check.stdout).toBe(0);
      if (context.context.runtimeId === "node") {
        const build = await runProcess("pnpm", ["run", "build"], { cwd: project, env });
        expect(build.exitCode, build.stderr + "\n" + build.stdout).toBe(0);
      }
      const doctor = await run(["doctor"]);
      expect(doctor.exitCode, doctor.stderr).toBe(0);
      expect(JSON.parse(doctor.stdout)).toMatchObject({ version: 1, kind: "doctor", failed: 0 });
      const repeated = await run(["add", id, "--yes"]);
      expect(repeated.exitCode, repeated.stderr).toBe(0);
      expect(JSON.parse(repeated.stdout).plan.operations).toEqual([]);
      expect(await readFile(path.join(project, lockName))).toEqual(finalLock);
      item.passed = true;
    } catch (error) {
      item.failure = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await cleanupWorkspace(parent, keepOnFailure());
      await cleanupWorkspace(path.join(root, "uv-cache"), keepOnFailure());
    }
  },
);

it.each(presetIds)("retains the $id preset and its JSON dry-run plan", async (id) => {
  if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
  const item: CaseEvidence = { id: "preset-plan/" + id, passed: false };
  cases.push(item);
  const cwd = path.join(root, "preset-plan-" + id);
  await mkdir(cwd);
  try {
    const before = await snapshotTree(cwd);
    const result = await runProcess(
      process.execPath,
      [artifact.bin, "--json", "create", "--preset", id, "--dry-run"],
      { cwd, env },
    );
    expect(result.exitCode, result.stderr).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan).toMatchObject({
      version: 1,
      kind: "plan",
      dryRun: true,
      plan: { valid: true, config: { schemaVersion: 1 } },
    });
    expect(plan.plan.operations.length).toBeGreaterThan(0);
    expect(await snapshotTree(cwd)).toEqual(before);
    item.passed = true;
  } catch (error) {
    item.failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await cleanupWorkspace(cwd, keepOnFailure());
  }
});

it("executes the existing React/Vite preset through the packed CLI", async () => {
  if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
  const item: CaseEvidence = { id: "preset-real/react-vite", passed: false };
  cases.push(item);
  const cwd = path.join(root, "preset-real-react-vite", "project");
  await mkdir(cwd, { recursive: true });
  try {
    const created = await runProcess(
      process.execPath,
      [artifact.bin, "--json", "create", "--preset", "react-vite", "--yes"],
      { cwd, env },
    );
    expect(created.exitCode, created.stderr + "\n" + created.stdout).toBe(0);
    expect(JSON.parse(created.stdout.split(/\r?\n/)[0]!)).toMatchObject({
      version: 1,
      kind: "plan",
      dryRun: false,
    });
    const lock = await readFile(path.join(cwd, "pnpm-lock.yaml"));
    expect(lock.length).toBeGreaterThan(100);
    item.lockSha256 = sha256(lock);
    await writeFile(path.join(evidenceDir, "preset-real-react-vite-pnpm-lock.yaml"), lock);
    const build = await runProcess("pnpm", ["run", "build"], { cwd, env });
    expect(build.exitCode, build.stderr + "\n" + build.stdout).toBe(0);
    const tests = await runProcess("pnpm", ["exec", "vitest", "run"], { cwd, env });
    expect(tests.exitCode, tests.stderr + "\n" + tests.stdout).toBe(0);
    const doctor = await runProcess(process.execPath, [artifact.bin, "--json", "doctor"], {
      cwd,
      env,
    });
    expect(doctor.exitCode, doctor.stderr).toBe(0);
    expect(JSON.parse(doctor.stdout)).toMatchObject({ version: 1, kind: "doctor", failed: 0 });
    item.passed = true;
  } catch (error) {
    item.failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await cleanupWorkspace(path.dirname(cwd), keepOnFailure());
    await cleanupWorkspace(path.join(root, "uv-cache"), keepOnFailure());
  }
});
