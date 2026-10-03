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
  writeJson,
} from "./harness.js";
import { planFingerprint, prepareSelectionArtifact, sha256 } from "./selection-artifact.js";
import {
  journeys,
  matrix,
  matrixPath,
  selectionFor,
  tokenFor,
  PRIVATE_MARKER,
} from "./selection-matrix.js";

const cases = journeys.filter((journey) => journey.mode === "add");
interface CaseEvidence {
  id: string;
  transport: "token" | "file";
  passed: boolean;
  steps: { label: string; command: string; args: string[]; exitCode: number }[];
  addedPlanSha256?: string;
  initialLockSha256?: string;
  finalLockSha256?: string;
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
  root = await createTempWorkspace("reposetup-selection-add-");
  evidenceDir = process.env.REPOSETUP_SELECTION_ADD_EVIDENCE_DIR ?? path.join(root, "evidence");
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
        kind: "selection-packed-add",
        releaseQualification: false,
        allCasesPassed: evidence.length === cases.length && evidence.every((item) => item.passed),
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
    ) + "\n",
    { flag: "wx" },
  );
  await cleanupWorkspace(root, keepOnFailure());
});

it.each(cases)("adds and verifies $id through the packed artifact", async (journey) => {
  if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
  const index = cases.indexOf(journey);
  const item: CaseEvidence = {
    id: journey.id,
    transport: index % 2 === 0 ? "token" : "file",
    passed: false,
    steps: [],
  };
  evidence.push(item);
  const caseDir = path.join(root, "case-" + index + " space ไทย");
  const logs = path.join(evidenceDir, "case-" + index);
  await mkdir(caseDir);
  await mkdir(logs);
  const project = path.join(caseDir, "projects/qualified-app");
  const selection = selectionFor(journey.context, journey.ids, "add");
  const file = path.join(caseDir, "selection.json");
  await writeJson(file, selection);
  const command = async (label: string, executable: string, args: string[], cwd = project) => {
    const result = await runProcess(executable, args, { cwd, env });
    item.steps.push({ label, command: executable, args, exitCode: result.exitCode });
    await writeJson(path.join(logs, String(item.steps.length) + "-" + label + ".json"), result);
    return result;
  };
  const succeeds = async (label: string, executable: string, args: string[], cwd = project) => {
    const result = await command(label, executable, args, cwd);
    expect(result.exitCode, label + ": " + result.stderr + "\n" + result.stdout).toBe(0);
    return result;
  };
  const input =
    item.transport === "token" ? ["--selection", tokenFor(selection)] : ["--config", file];
  try {
    const createFile = path.join(caseDir, "create.json");
    await writeJson(createFile, selectionFor(journey.context, [], "create"));
    await succeeds(
      "create-base",
      process.execPath,
      [
        fixturePath("confirmed-selection-create.mjs"),
        path.join(artifact.installDir, "node_modules/rsetup/dist/index.js"),
        createFile,
        "file",
      ],
      caseDir,
    );
    const lockName = journey.context.context.runtimeId === "node" ? "pnpm-lock.yaml" : "uv.lock";
    item.initialLockSha256 = sha256(await readFile(path.join(project, lockName)));
    const readme = await readFile(path.join(project, "README.md"));
    const baselineManifest =
      journey.context.context.runtimeId === "node"
        ? JSON.parse(await readFile(path.join(project, "package.json"), "utf8"))
        : await readFile(path.join(project, "pyproject.toml"), "utf8");
    await writeFile(path.join(project, ".env"), "PRIVATE_TOKEN=" + PRIVATE_MARKER + "\n");
    await writeFile(path.join(project, ".env.example"), "PRIVATE_TOKEN=\n");
    await writeFile(path.join(project, "user-notes.txt"), "Keep custom project notes.\n");
    const prettierConfig = '{\n  "singleQuote": true\n}\n';
    if (journey.ids.includes("prettier"))
      await writeFile(path.join(project, ".prettierrc"), prettierConfig);
    const before = await sourceHashes(project);
    const mismatched = matrix.contexts.find((context) => context.id !== journey.context.id)!;
    const mismatch = await command("context-refused", process.execPath, [
      artifact.bin,
      "--json",
      "add",
      "--selection",
      tokenFor(selectionFor(mismatched, [mismatched.optionalIds[0]!], "add")),
      "--dry-run",
    ]);
    expect(mismatch.exitCode).not.toBe(0);
    expect(JSON.parse(mismatch.stderr.trim().split(/\r?\n/).at(-1)!)).toMatchObject({
      version: 1,
      kind: "error",
      error: { code: "UNSUPPORTED_CONTEXT" },
    });
    expect(await sourceHashes(project)).toEqual(before);
    const dry = await succeeds("dry-run", process.execPath, [
      artifact.bin,
      "--json",
      "add",
      ...input,
      "--dry-run",
    ]);
    const dryPlan = JSON.parse(dry.stdout).plan;
    expect(dryPlan.operations.length).toBeGreaterThan(0);
    item.addedPlanSha256 = planFingerprint(dryPlan);
    expect(await sourceHashes(project)).toEqual(before);
    const added = await succeeds("add", process.execPath, [
      fixturePath("confirmed-selection-create.mjs"),
      path.join(artifact.installDir, "node_modules/rsetup/dist/index.js"),
      file,
      item.transport,
      "add",
    ]);
    expect(added.stderr).toContain("Decoded selection (add,");
    expect(added.stderr).toContain("reviewed choices and plan; confirmed");
    expect(planFingerprint(JSON.parse(added.stdout.split(/\r?\n/)[0]!).plan)).toBe(
      item.addedPlanSha256,
    );
    expect(added.stdout + added.stderr).not.toContain(PRIVATE_MARKER);
    expect(await readFile(path.join(project, "README.md"))).toEqual(readme);
    expect(await readFile(path.join(project, ".env"), "utf8")).toBe(
      "PRIVATE_TOKEN=" + PRIVATE_MARKER + "\n",
    );
    expect(await readFile(path.join(project, "user-notes.txt"), "utf8")).toBe(
      "Keep custom project notes.\n",
    );
    if (journey.ids.includes("prettier"))
      expect(await readFile(path.join(project, ".prettierrc"), "utf8")).toBe(prettierConfig);
    item.finalLockSha256 = sha256(await readFile(path.join(project, lockName)));
    expect(item.finalLockSha256).not.toBe(item.initialLockSha256);
    await writeFile(path.join(logs, lockName), await readFile(path.join(project, lockName)));
    if (journey.context.context.runtimeId === "node") {
      await succeeds("build", "pnpm", ["run", "build"]);
      if (journey.ids.includes("vitest"))
        await succeeds("vitest", "pnpm", ["exec", "vitest", "run"]);
      if (journey.ids.includes("zod"))
        await succeeds("zod", process.execPath, [
          "--input-type=module",
          "-e",
          "import { z } from 'zod'; if (!z.number().safeParse(42).success) process.exit(1)",
        ]);
      if (journey.ids.includes("prettier"))
        await succeeds("prettier", "pnpm", ["exec", "prettier", "--check", ".prettierrc"]);
      const manifest = JSON.parse(await readFile(path.join(project, "package.json"), "utf8"));
      for (const section of ["dependencies", "devDependencies", "scripts"] as const)
        for (const [name, declaration] of Object.entries(baselineManifest[section] ?? {}))
          expect(manifest[section]?.[name]).toBe(declaration);
      const versions = await succeeds("versions", process.execPath, [
        "-e",
        "const fs=require('node:fs');const ids=JSON.parse(process.argv[1]);console.log(JSON.stringify(Object.fromEntries(ids.map(id=>[id,JSON.parse(fs.readFileSync('node_modules/'+id+'/package.json','utf8')).version]))))",
        JSON.stringify(journey.ids),
      ]);
      item.installedVersions = JSON.parse(versions.stdout);
      for (const id of journey.ids) {
        const declared = manifest.dependencies?.[id] ?? manifest.devDependencies?.[id];
        expect(matrix.directVersions[id]).toContain(id + "@" + declared);
        expect(item.installedVersions?.[id]).toBe(declared);
      }
    } else {
      const originalFastapiPin = (baselineManifest as string).match(
        /fastapi\[standard\]==[0-9.]+/,
      )?.[0];
      expect(originalFastapiPin).toBeTruthy();
      expect(await readFile(path.join(project, "pyproject.toml"), "utf8")).toContain(
        originalFastapiPin,
      );
      const verified = await succeeds("versions", "uv", [
        "run",
        "--frozen",
        "python",
        "-c",
        "import json,sys; from importlib.metadata import version; print(json.dumps({name:version(name) for name in json.loads(sys.argv[1])}))",
        JSON.stringify(journey.ids),
      ]);
      item.installedVersions = JSON.parse(verified.stdout);
      for (const id of journey.ids)
        expect(matrix.directVersions[id]).toContain(id + "==" + item.installedVersions?.[id]);
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
    const after = await sourceHashes(project);
    for (let repeat = 0; repeat < 2; repeat++) {
      const repeated = await succeeds("repeat-" + repeat, process.execPath, [
        artifact.bin,
        "--json",
        "add",
        ...input,
      ]);
      expect(JSON.parse(repeated.stdout).plan.operations).toEqual([]);
      expect(await sourceHashes(project)).toEqual(after);
      expect(sha256(await readFile(path.join(project, lockName)))).toBe(item.finalLockSha256);
    }
    item.passed = true;
  } catch (error) {
    item.failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await cleanupWorkspace(caseDir, keepOnFailure());
    await cleanupWorkspace(path.join(root, "uv-cache"), keepOnFailure());
  }
});

async function sourceHashes(root: string): Promise<Record<string, string>> {
  const ignored = new Set([
    "node_modules",
    ".venv",
    "dist",
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
