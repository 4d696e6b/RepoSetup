import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { release, version } from "node:os";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  cleanupWorkspace,
  createTempWorkspace,
  fixturePath,
  keepOnFailure,
  runProcess,
  snapshotTree,
  writeJson,
} from "./harness.js";
import { planFingerprint, prepareSelectionArtifact, sha256 } from "./selection-artifact.js";
import { journeys, matrix, matrixPath, selectionFor, tokenFor } from "./selection-matrix.js";

const cases = journeys.filter((journey) => journey.mode === "create");
interface CaseEvidence {
  id: string;
  transport: "token" | "file";
  passed: boolean;
  steps: { label: string; command: string; args: string[]; exitCode: number }[];
  lockSha256?: string;
  planSha256?: string;
  installedVersions?: Record<string, string>;
  failure?: string;
}
let root: string;
let evidenceDir: string;
let artifact: Awaited<ReturnType<typeof prepareSelectionArtifact>> | undefined;
let env: NodeJS.ProcessEnv;
let pythonVersion = "";
let uvVersion = "";
let setupFailure: string | undefined;
const evidence: CaseEvidence[] = [];

beforeAll(async () => {
  root = await createTempWorkspace("reposetup-selection-create-");
  evidenceDir = process.env.REPOSETUP_SELECTION_CREATE_EVIDENCE_DIR ?? path.join(root, "evidence");
  // Never replace evidence from an earlier run.
  await mkdir(evidenceDir);
  try {
    expect(Number(process.versions.node.split(".")[0]), "Use the frozen Node major").toBe(
      matrix.runtimes.nodeMajor,
    );
    const python = process.env.UV_PYTHON ?? (process.platform === "win32" ? "python" : "python3");
    const resolved = await runProcess(
      python,
      ["-c", "import sys; print(sys.executable); print(sys.version.split()[0])"],
      { cwd: root },
    );
    expect(resolved.exitCode, resolved.stderr).toBe(0);
    const [executable, version] = resolved.stdout.trim().split(/\r?\n/);
    expect(executable).toBeTruthy();
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
  const allCasesPassed = evidence.length === cases.length && evidence.every((item) => item.passed);
  await writeFile(
    path.join(evidenceDir, "report.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        kind: "selection-packed-create",
        releaseQualification: false,
        allCasesPassed,
        expectedCases: cases.length,
        confirmation: "packed runCli with reviewed-plan confirmation adapter; native TTY pending",
        platform: process.platform,
        architecture: process.arch,
        operatingSystem: { release: release(), version: version() },
        workflow:
          process.env.GITHUB_ACTIONS === "true"
            ? {
                runId: process.env.GITHUB_RUN_ID,
                attempt: process.env.GITHUB_RUN_ATTEMPT,
                job: process.env.GITHUB_JOB,
              }
            : undefined,
        runtime: {
          node: process.version,
          python: pythonVersion,
          uv: uvVersion,
          ...artifact?.tools,
        },
        matrixRevision: matrix.revision,
        matrixSha256: sha256(await readFile(matrixPath)),
        catalogRevision: matrix.catalogRevision,
        artifact: artifact?.identity,
        sourceDirty: artifact?.sourceDirty,
        externalArtifact: artifact?.externalArtifact,
        installedCliLockSha256: artifact?.installedLockSha256,
        setupFailure,
        cases: evidence,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  await cleanupWorkspace(root, keepOnFailure());
});

it.each(cases)("creates and verifies $id through the packed artifact", async (journey) => {
  if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
  const index = cases.indexOf(journey);
  const item: CaseEvidence = {
    id: journey.id,
    transport: index % 2 === 0 ? "token" : "file",
    passed: false,
    steps: [],
  };
  evidence.push(item);
  const caseDir = path.join(root, `case-${index} space ไทย`);
  const logs = path.join(evidenceDir, `case-${index}`);
  await mkdir(caseDir);
  await mkdir(logs);
  const parentMarker = "Keep the parent README.\n";
  await writeFile(path.join(caseDir, "README.md"), parentMarker);
  await mkdir(path.join(caseDir, "sibling"));
  await writeFile(path.join(caseDir, "sibling/user.txt"), "Keep the sibling.\n");
  const selection = selectionFor(journey.context, journey.ids, "create");
  const file = path.join(caseDir, "selection.json");
  await writeJson(file, selection);
  const project = path.join(caseDir, "projects/qualified-app");
  const command = async (label: string, executable: string, args: string[], cwd = project) => {
    const result = await runProcess(executable, args, { cwd, env });
    item.steps.push({ label, command: executable, args, exitCode: result.exitCode });
    await writeJson(path.join(logs, `${item.steps.length}-${label}.json`), result);
    return result;
  };
  const succeeds = async (label: string, executable: string, args: string[], cwd = project) => {
    const result = await command(label, executable, args, cwd);
    expect(result.exitCode, `${label}: ${result.stderr}\n${result.stdout}`).toBe(0);
    return result;
  };
  try {
    const untouched = await snapshotTree(caseDir);
    const dry = await succeeds(
      "dry-run",
      process.execPath,
      [artifact.bin, "--json", "create", "--selection", tokenFor(selection), "--dry-run"],
      caseDir,
    );
    item.planSha256 = planFingerprint(JSON.parse(dry.stdout).plan);
    expect(item.planSha256).toBe(matrix.planSha256[journey.id]);
    expect(await snapshotTree(caseDir)).toEqual(untouched);
    const created = await succeeds(
      "create",
      process.execPath,
      [
        fixturePath("confirmed-selection-create.mjs"),
        path.join(artifact.installDir, "node_modules/rsetup/dist/index.js"),
        file,
        item.transport,
      ],
      caseDir,
    );
    expect(created.stderr).toContain("reviewed choices and plan; confirmed");
    expect(planFingerprint(JSON.parse(created.stdout.split(/\r?\n/)[0]!).plan)).toBe(
      item.planSha256,
    );
    const lockName = journey.context.context.runtimeId === "node" ? "pnpm-lock.yaml" : "uv.lock";
    const lock = await readFile(path.join(project, lockName));
    expect(lock.length).toBeGreaterThan(100);
    item.lockSha256 = sha256(lock);
    await writeFile(path.join(logs, lockName), lock);

    if (journey.context.context.runtimeId === "node") {
      await succeeds("build", "pnpm", ["run", "build"]);
      if (journey.context.context.frameworkId === "react-vite") {
        expect(await readFile(path.join(project, "dist/index.html"), "utf8")).toContain(
          '<div id="root"',
        );
      } else {
        await succeeds("endpoint", process.execPath, ["--input-type=module", "-e", EXPRESS_PROBE]);
      }
      if (journey.ids.includes("vitest"))
        await succeeds("vitest", "pnpm", ["exec", "vitest", "run"]);
      if (journey.ids.includes("prettier"))
        await succeeds("prettier", "pnpm", [
          "exec",
          "prettier",
          "--check",
          "src",
          ...(journey.context.context.frameworkId === "react-vite" ? ["vite.config.ts"] : []),
          ".prettierrc",
        ]);
      if (journey.ids.includes("zod"))
        await succeeds("zod", process.execPath, ["--input-type=module", "-e", ZOD_PROBE]);
      const packages = [
        ...(journey.context.context.frameworkId === "react-vite"
          ? ["vite", "react"]
          : ["express", "typescript"]),
        ...journey.ids,
      ];
      const versions = await succeeds("versions", process.execPath, [
        "-e",
        "const fs = require('node:fs'); const ids = JSON.parse(process.argv[1]); console.log(JSON.stringify(Object.fromEntries(ids.map(id => [id, JSON.parse(fs.readFileSync('node_modules/' + id + '/package.json', 'utf8')).version]))));",
        JSON.stringify(packages),
      ]);
      item.installedVersions = JSON.parse(versions.stdout);
      const manifest = JSON.parse(await readFile(path.join(project, "package.json"), "utf8"));
      for (const id of packages) {
        const owner = ["react", "vite"].includes(id)
          ? "react-vite"
          : id === "typescript"
            ? "express"
            : id;
        const declared = manifest.dependencies?.[id] ?? manifest.devDependencies?.[id];
        expect(matrix.directVersions[owner]).toContain(`${id}@${declared}`);
        if (owner !== "react-vite") expect(item.installedVersions?.[id]).toBe(declared);
      }
    } else {
      const verified = await succeeds("endpoint-versions", "uv", [
        "run",
        "--frozen",
        "python",
        "-c",
        PYTHON_PROBE,
        JSON.stringify(["fastapi", ...journey.ids]),
      ]);
      const result = JSON.parse(verified.stdout);
      expect(result.python).toBe(pythonVersion);
      item.installedVersions = result.versions;
      for (const id of ["fastapi", ...journey.ids]) {
        const dependency = id === "fastapi" ? "fastapi[standard]" : id;
        expect(matrix.directVersions[id]).toContain(
          `${dependency}==${item.installedVersions?.[id]}`,
        );
      }
      if (journey.ids.includes("pytest"))
        await succeeds("pytest", "uv", ["run", "--frozen", "pytest"]);
      if (journey.ids.includes("ruff"))
        await succeeds("ruff", "uv", [
          "run",
          "--frozen",
          "ruff",
          "check",
          "main.py",
          ...(journey.ids.includes("pytest") ? ["test_main.py"] : []),
        ]);
    }
    const doctor = await succeeds("doctor", process.execPath, [artifact.bin, "--json", "doctor"]);
    const health = JSON.parse(doctor.stdout);
    expect(health).toMatchObject({ version: 1, kind: "doctor", failed: 0 });
    for (const id of [journey.context.context.frameworkId, ...journey.ids])
      expect(health.result.checks).toContainEqual(expect.objectContaining({ id, ok: true }));
    expect(sha256(await readFile(path.join(project, lockName)))).toBe(item.lockSha256);
    const beforeRepeat = await sourceHashes(project);
    const repeated = await command(
      "repeat-refused",
      process.execPath,
      [
        fixturePath("confirmed-selection-create.mjs"),
        path.join(artifact.installDir, "node_modules/rsetup/dist/index.js"),
        file,
        item.transport,
      ],
      caseDir,
    );
    expect(repeated.exitCode).not.toBe(0);
    expect(JSON.parse(repeated.stderr.trim().split(/\r?\n/).at(-1)!)).toMatchObject({
      version: 1,
      kind: "error",
      error: { code: "FILE_ALREADY_EXISTS" },
    });
    expect(await sourceHashes(project)).toEqual(beforeRepeat);
    expect(await readFile(path.join(caseDir, "README.md"), "utf8")).toBe(parentMarker);
    expect(await readFile(path.join(caseDir, "sibling/user.txt"), "utf8")).toBe(
      "Keep the sibling.\n",
    );
    expect((await readdir(caseDir)).sort()).toEqual(
      ["README.md", "projects", "selection.json", "sibling"].sort(),
    );
    item.passed = true;
  } catch (error) {
    item.failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    // Keep logs/locks in evidenceDir, but don't accumulate 24 dependency trees by default.
    await cleanupWorkspace(caseDir, keepOnFailure());
    await cleanupWorkspace(path.join(root, "uv-cache"), keepOnFailure());
  }
});

// Hash user-visible/generated files, excluding dependency trees and derived build/cache output.
async function sourceHashes(root: string): Promise<Record<string, string>> {
  const ignored = new Set([
    "node_modules",
    ".venv",
    "dist",
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
  ]);
  const hashes: Record<string, string> = {};
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile())
        hashes[path.relative(root, file).split(path.sep).join("/")] = sha256(await readFile(file));
      else throw new Error("Unexpected link in generated source fixture");
    }
  }
  await walk(root);
  return hashes;
}

const EXPRESS_PROBE = `
process.env.REPOSETUP_NO_LISTEN = '1';
const { app } = await import('./dist/src/app.js');
const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
try {
  const response = await fetch('http://127.0.0.1:' + server.address().port);
  if (response.status !== 200 || await response.text() !== 'Hello World!') throw new Error('Unexpected endpoint response');
} finally { await new Promise(resolve => server.close(resolve)); }
`;
const ZOD_PROBE = `
import { z } from 'zod';
const schema = z.object({ port: z.number().int().positive() });
if (!schema.safeParse({ port: 3000 }).success || schema.safeParse({ port: 'bad' }).success) throw new Error('Invalid Zod behavior');
`;
const PYTHON_PROBE = `
import json, sys
from importlib.metadata import version
from fastapi.testclient import TestClient
from main import app
response = TestClient(app).get('/')
assert response.status_code == 200 and response.json() == {'message': 'Hello World'}
if 'pydantic' in json.loads(sys.argv[1]):
    from pydantic import BaseModel, ValidationError
    class Input(BaseModel):
        port: int
    assert Input(port=3000).port == 3000
    try:
        Input(port='bad')
    except ValidationError:
        pass
    else:
        raise AssertionError('Invalid Pydantic behavior')
print(json.dumps({'python': sys.version.split()[0], 'versions': {name: version(name) for name in json.loads(sys.argv[1])}}))
`;
