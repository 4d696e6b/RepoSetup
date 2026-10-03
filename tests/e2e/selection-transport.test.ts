import { mkdir, readFile, writeFile } from "node:fs/promises";
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
import { prepareSelectionArtifact, sha256 } from "./selection-artifact.js";
import { matrix, matrixPath, selectionFor, writeExistingContext } from "./selection-matrix.js";

type Alias = "rsetup" | "reposetup";
type Mode = "create" | "add";
type Route = "token" | "file";
const aliases: Alias[] = ["rsetup", "reposetup"];
const modes: Mode[] = ["create", "add"];
let root: string;
let evidenceDir: string;
let artifact: Awaited<ReturnType<typeof prepareSelectionArtifact>> | undefined;
const cases: { id: string; passed: boolean; failure?: string }[] = [];

beforeAll(async () => {
  root = await createTempWorkspace("reposetup-selection-transport-");
  evidenceDir =
    process.env.REPOSETUP_SELECTION_TRANSPORT_EVIDENCE_DIR ?? path.join(root, "evidence");
  await mkdir(evidenceDir);
  expect(Number(process.versions.node.split(".")[0])).toBe(matrix.runtimes.nodeMajor);
  artifact = await prepareSelectionArtifact(root);
  expect(artifact.tools.pnpm).toBe(matrix.runtimes.pnpm);
});

afterAll(async () => {
  if (evidenceDir === undefined) return;
  await writeFile(
    path.join(evidenceDir, "report.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        kind: "selection-native-transport",
        releaseQualification: false,
        allCasesPassed:
          cases.length === aliases.length * modes.length + 2 && cases.every((item) => item.passed),
        nativeTtyCovered:
          cases.some((item) => item.id === "native-tty-create" && item.passed) &&
          cases.some((item) => item.id === "native-tty-add" && item.passed),
        platform: process.platform,
        architecture: process.arch,
        operatingSystem: { release: release(), version: version() },
        runtime: { node: process.version, ...artifact?.tools },
        matrixRevision: matrix.revision,
        matrixSha256: sha256(await readFile(matrixPath)),
        artifact: artifact?.identity,
        sourceDirty: artifact?.sourceDirty,
        externalArtifact: artifact?.externalArtifact,
        shell: process.platform === "win32" ? "cmd.exe and pwsh.exe" : "/bin/sh",
        cases,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  await cleanupWorkspace(root, keepOnFailure());
});

it.each(aliases.flatMap((alias) => modes.map((mode) => ({ alias, mode }))))(
  "launches $alias $mode through the native shell with token and file bounds",
  async ({ alias, mode }) => {
    if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
    const id = alias + "/" + mode;
    const item: (typeof cases)[number] = { id, passed: false };
    cases.push(item);
    const cwd = path.join(root, "shell " + id.replace("/", "-") + " ไทย");
    await mkdir(cwd);
    try {
      const context = matrix.contexts[0]!;
      if (mode === "add") await writeExistingContext(cwd, context);
      const selection = selectionFor(context, mode === "add" ? ["zod"] : [], mode);
      const json = JSON.stringify(selection);
      const limit = matrix.limits.tokenBytes!;
      expect(Buffer.byteLength(json)).toBeLessThan(limit);
      const maxTokenJson = json + " ".repeat(limit - Buffer.byteLength(json));
      const token = Buffer.from(maxTokenJson, "utf8").toString("base64url");
      expect(token).toHaveLength(matrix.limits.tokenCharacters!);
      const file = path.join(cwd, "selection  ไทย.json");
      await writeFile(file, json + " ".repeat(matrix.limits.fileBytes! - Buffer.byteLength(json)));
      expect((await readFile(file)).length).toBe(matrix.limits.fileBytes);
      const oversizedFile = path.join(cwd, "oversized selection.json");
      await writeFile(
        oversizedFile,
        json + " ".repeat(matrix.limits.fileBytes! + 1 - Buffer.byteLength(json)),
      );
      const before = await snapshotTree(cwd);
      const tokenRun = await runShell(alias, mode, "token", token, cwd, true);
      expect(tokenRun.exitCode, tokenRun.stderr).toBe(0);
      const fileRun = await runShell(alias, mode, "file", file, cwd, true);
      expect(fileRun.exitCode, fileRun.stderr).toBe(0);
      const tokenPlan = JSON.parse(tokenRun.stdout);
      expect(tokenPlan).toMatchObject({ version: 1, kind: "plan", dryRun: true });
      expect(JSON.parse(fileRun.stdout)).toEqual(tokenPlan);
      expect(tokenRun.stderr).toContain("Decoded selection (" + mode + ",");
      expect(await snapshotTree(cwd)).toEqual(before);
      const oversized = await runShell(
        alias,
        mode,
        "token",
        "A".repeat(matrix.limits.tokenCharacters! + 1),
        cwd,
        true,
      );
      expect(oversized.exitCode).toBe(2);
      expect(JSON.parse(oversized.stderr.trim().split(/\r?\n/).at(-1)!)).toMatchObject({
        version: 1,
        kind: "error",
        error: { code: "SELECTION_INVALID", details: { reason: "size" } },
      });
      expect(oversized.stdout + oversized.stderr).not.toContain("A".repeat(128));
      const oversizedFromFile = await runShell(alias, mode, "file", oversizedFile, cwd, true);
      expect(oversizedFromFile.exitCode).toBe(2);
      expect(JSON.parse(oversizedFromFile.stderr.trim().split(/\r?\n/).at(-1)!)).toMatchObject({
        version: 1,
        kind: "error",
        error: { code: "SELECTION_INVALID", details: { reason: "file" } },
      });
      expect(await snapshotTree(cwd)).toEqual(before);
      const refused = await runShell(alias, mode, "token", token, cwd, false);
      expect(refused.exitCode).toBe(2);
      expect(refused.stderr).toContain("Decoded selection");
      expect(refused.stderr).toContain("requires interactive confirmation");
      expect(JSON.parse(refused.stdout)).toMatchObject({ version: 1, kind: "plan", dryRun: false });
      expect(await snapshotTree(cwd)).toEqual(before);
      item.passed = true;
    } catch (error) {
      item.failure = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await cleanupWorkspace(cwd, keepOnFailure());
    }
  },
);

it("uses the native terminal prompt to decline and accept create", async () => {
  const item: (typeof cases)[number] = { id: "native-tty-create", passed: false };
  cases.push(item);
  if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
  const python = process.env.UV_PYTHON ?? "python3";
  for (const answer of ["n", "y"] as const) {
    const cwd = path.join(root, "terminal-" + answer + " space ไทย");
    await mkdir(cwd);
    try {
      const selection = selectionFor(matrix.contexts[1]!, [], "create");
      const token = Buffer.from(JSON.stringify(selection), "utf8").toString("base64url");
      const before = await snapshotTree(cwd);
      const result = await runProcess(
        python,
        [
          fixturePath(process.platform === "win32" ? "winpty-selection.py" : "pty-selection.py"),
          "reposetup",
          "create",
          answer,
        ],
        {
          cwd,
          env: launcherEnvironment(token),
        },
      );
      expect(result.exitCode, result.stderr).toBe(0);
      const transcript = JSON.parse(result.stdout) as {
        childExitCode: number;
        reviewed: boolean;
        prompted: boolean;
        transcript: string;
      };
      expect(
        transcript.reviewed,
        transcript.transcript.replaceAll(token, "[token]").slice(-1000),
      ).toBe(true);
      expect(transcript.prompted).toBe(true);
      expect(transcript.transcript).not.toContain(token);
      if (answer === "n") {
        expect(transcript.childExitCode).toBe(2);
        expect(await snapshotTree(cwd)).toEqual(before);
      } else {
        expect(transcript.childExitCode).toBe(0);
        const project = path.join(cwd, "projects/qualified-app");
        expect((await readFile(path.join(project, "pnpm-lock.yaml"))).length).toBeGreaterThan(100);
        const built = await runProcess("pnpm", ["run", "build"], { cwd: project });
        expect(built.exitCode, built.stderr).toBe(0);
      }
    } catch (error) {
      item.failure = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await cleanupWorkspace(cwd, keepOnFailure());
    }
  }
  item.passed = true;
});

it("uses the native terminal prompt to decline and accept add", async () => {
  const item: (typeof cases)[number] = { id: "native-tty-add", passed: false };
  cases.push(item);
  if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
  const python = process.env.UV_PYTHON ?? "python3";
  const parent = path.join(root, "terminal-add space ไทย");
  await mkdir(parent);
  try {
    const context = matrix.contexts[1]!;
    const createFile = path.join(parent, "create.json");
    await writeJson(createFile, selectionFor(context, [], "create"));
    const base = await runProcess(
      process.execPath,
      [
        fixturePath("confirmed-selection-create.mjs"),
        path.join(artifact.installDir, "node_modules/rsetup/dist/index.js"),
        createFile,
        "file",
      ],
      { cwd: parent, env: launcherEnvironment("") },
    );
    expect(base.exitCode, base.stderr).toBe(0);
    const cwd = path.join(parent, "projects/qualified-app");
    const selection = selectionFor(context, ["zod"], "add");
    const token = Buffer.from(JSON.stringify(selection), "utf8").toString("base64url");
    const manifestBefore = await readFile(path.join(cwd, "package.json"));
    const lockBefore = await readFile(path.join(cwd, "pnpm-lock.yaml"));
    for (const answer of ["n", "y"] as const) {
      const result = await runProcess(
        python,
        [
          fixturePath(process.platform === "win32" ? "winpty-selection.py" : "pty-selection.py"),
          "rsetup",
          "add",
          answer,
        ],
        {
          cwd,
          env: launcherEnvironment(token),
        },
      );
      expect(result.exitCode, result.stderr).toBe(0);
      const transcript = JSON.parse(result.stdout) as {
        childExitCode: number;
        reviewed: boolean;
        prompted: boolean;
        transcript: string;
      };
      expect(
        transcript.reviewed,
        transcript.transcript.replaceAll(token, "[token]").slice(-1000),
      ).toBe(true);
      expect(transcript.prompted).toBe(true);
      expect(transcript.transcript).not.toContain(token);
      if (answer === "n") {
        expect(transcript.childExitCode).toBe(2);
        expect(await readFile(path.join(cwd, "package.json"))).toEqual(manifestBefore);
        expect(await readFile(path.join(cwd, "pnpm-lock.yaml"))).toEqual(lockBefore);
      } else {
        expect(transcript.childExitCode).toBe(0);
        const manifest = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8"));
        expect(manifest.dependencies.zod).toBe("4.6.5");
        expect(await readFile(path.join(cwd, "pnpm-lock.yaml"))).not.toEqual(lockBefore);
        const repeated = await runShell("rsetup", "add", "token", token, cwd, false);
        expect(repeated.exitCode, repeated.stderr).toBe(0);
        expect(JSON.parse(repeated.stdout).plan.operations).toEqual([]);
      }
    }
    item.passed = true;
  } catch (error) {
    item.failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await cleanupWorkspace(parent, keepOnFailure());
  }
});

function launcherEnvironment(input: string): NodeJS.ProcessEnv {
  if (artifact === undefined) throw new Error("Packed artifact setup did not complete");
  const binDir = path.join(artifact.installDir, "node_modules", ".bin");
  const env: NodeJS.ProcessEnv = { ...process.env, REPOSETUP_TEST_INPUT: input };
  if (process.platform === "win32") {
    delete env.PATH;
    env.Path = binDir + path.delimiter + (process.env.Path ?? process.env.PATH ?? "");
  } else env.PATH = binDir + path.delimiter + (process.env.PATH ?? "");
  return env;
}

async function runShell(
  alias: Alias,
  mode: Mode,
  route: Route,
  input: string,
  cwd: string,
  dryRun: boolean,
) {
  const flag =
    route === "token" ? "--selection" : mode === "create" ? "--selection-file" : "--config";
  const suffix = dryRun ? " --dry-run" : "";
  if (process.platform === "win32") {
    if (route === "file") {
      // PowerShell passes the environment value as one native-command argument,
      // including spaces and Unicode, without embedding the path in shell code.
      const command = `& ${alias}.cmd --json ${mode} ${flag} $env:REPOSETUP_TEST_INPUT${suffix}; exit $LASTEXITCODE`;
      return runProcess("pwsh.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
        cwd,
        env: launcherEnvironment(input),
      });
    }
    // The token is generated by this fixture and contains only base64url
    // characters. Pass it as a pasted command would: cmd.exe's environment
    // expansion changes an exact 4096-character token at the boundary.
    const command = alias + " --json " + mode + " " + flag + " " + input + suffix;
    return runProcess(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command], {
      cwd,
      env: launcherEnvironment(input),
    });
  }
  const command =
    "exec " + alias + " --json " + mode + " " + flag + ' "$REPOSETUP_TEST_INPUT"' + suffix;
  return runProcess("/bin/sh", ["-c", command], { cwd, env: launcherEnvironment(input) });
}
