import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupWorkspace,
  createTempWorkspace,
  keepOnFailure,
  repoRoot,
  runNodeCli,
  runProcess,
  type CliRunResult,
} from "./harness.js";

const preset = process.env.REPOSETUP_USABILITY_PRESET ?? "react-vite";
const addId = process.env.REPOSETUP_USABILITY_ADD ?? "zod";
const enabled = process.env.REPOSETUP_USABILITY === "1";
const tempDirs: string[] = [];

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((dir) => cleanupWorkspace(dir, keep)));
});

describe("non-TTY usability session", () => {
  it.skipIf(!enabled)(
    `published install, preview, create, run, test, add ${addId}, doctor, and export for ${preset}`,
    async () => {
      const evidence = await runUsabilitySession(preset, addId);
      const evidencePath = process.env.REPOSETUP_USABILITY_EVIDENCE;
      if (evidencePath !== undefined) {
        await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
      }
      expect(evidence.steps.every((step) => step.exitCode === 0)).toBe(true);
    },
  );
});

async function runUsabilitySession(presetId: string, integrationId: string) {
  const packDir = await mkdtemp(path.join(os.tmpdir(), "reposetup-usability-pack-"));
  tempDirs.push(packDir);
  const packed = await runProcess(
    "pnpm",
    ["--filter", "rsetup", "pack", "--pack-destination", packDir],
    { cwd: repoRoot },
  );
  expect(packed.exitCode, packed.stderr).toBe(0);
  const tarball = (await readdir(packDir)).find((name) => name.endsWith(".tgz"));
  expect(tarball).toBeDefined();

  const installDir = await createTempWorkspace("reposetup-usability-install-");
  tempDirs.push(installDir);
  const installed = await runProcess("npm", ["install", path.join(packDir, tarball as string)], {
    cwd: installDir,
  });
  expect(installed.exitCode, installed.stderr).toBe(0);
  const bin = path.join(installDir, "node_modules", "rsetup", "dist", "bin.js");

  const parent = await createTempWorkspace("reposetup-usability-");
  tempDirs.push(parent);
  const projectDir = path.join(parent, "app");
  await mkdir(projectDir);

  const steps: Array<{ name: string; exitCode: number }> = [];
  const preview = await cli(
    bin,
    ["--no-color", "--json", "create", "--preset", presetId, "--dry-run"],
    {
      cwd: projectDir,
    },
  );
  steps.push({ name: "preview", exitCode: preview.exitCode });
  expect(preview.exitCode, preview.stderr).toBe(0);
  const previewJson = JSON.parse(preview.stdout) as {
    version: number;
    kind: string;
    dryRun: boolean;
  };
  expect(previewJson).toMatchObject({ version: 1, kind: "plan", dryRun: true });
  const before = await readdir(projectDir);
  expect(before).toEqual([]);

  const created = await cli(bin, ["--no-color", "create", "--preset", presetId, "--yes"], {
    cwd: projectDir,
  });
  steps.push({ name: "create", exitCode: created.exitCode });
  expect(created.exitCode, `${created.stdout}\n${created.stderr}`).toBe(0);
  expect(created.stdout).toContain("Project directory:");
  const nextCommands = created.stdout
    .split("\n")
    .filter((line) => line.startsWith("Next: "))
    .map((line) => line.slice("Next: ".length).trim());
  expect(nextCommands.length).toBeGreaterThan(0);

  for (const command of nextCommands) {
    const result = isServerCommand(command)
      ? await probeServer(projectDir, command)
      : await cliArgs(projectDir, command);
    steps.push({ name: command, exitCode: result.exitCode });
    expect(result.exitCode, `${command}\n${result.stdout}\n${result.stderr}`).toBe(0);
  }

  const added = await cli(bin, ["--no-color", "add", integrationId, "--yes"], { cwd: projectDir });
  steps.push({ name: "add", exitCode: added.exitCode });
  expect(added.exitCode, `${added.stdout}\n${added.stderr}`).toBe(0);

  const doctor = await cli(bin, ["--no-color", "--json", "doctor"], { cwd: projectDir });
  steps.push({ name: "doctor", exitCode: doctor.exitCode });
  expect(doctor.exitCode, `${doctor.stdout}\n${doctor.stderr}`).toBe(0);
  expect(JSON.parse(doctor.stdout)).toMatchObject({ version: 1, kind: "doctor" });

  const exported = await cli(bin, ["--no-color", "export", "--yes"], { cwd: projectDir });
  steps.push({ name: "export", exitCode: exported.exitCode });
  expect(exported.exitCode, exported.stderr).toBe(0);
  const config = JSON.parse(await readFile(path.join(projectDir, "reposetup.json"), "utf8")) as {
    schemaVersion: number;
  };
  expect(config.schemaVersion).toBe(1);

  return {
    preset: presetId,
    add: integrationId,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    steps,
  };
}

function sessionEnv(): NodeJS.ProcessEnv {
  return { ...process.env, CI: "true", NO_COLOR: "1", FORCE_COLOR: "0" };
}

function cli(
  bin: string,
  args: readonly string[],
  options: { cwd: string },
): Promise<CliRunResult> {
  return runNodeCli(bin, args, { ...options, env: sessionEnv() });
}

function cliArgs(cwd: string, command: string): Promise<CliRunResult> {
  const [file, ...args] = command.split(" ");
  return runProcess(file as string, args, { cwd, env: sessionEnv() });
}

function isServerCommand(command: string): boolean {
  return /(\sdev|\sstart|flask run|node (dist\/)?app\.js)$/.test(command);
}

function probeServer(cwd: string, command: string): Promise<CliRunResult> {
  const [file, ...args] = command.split(" ");
  const launch = windowsCommand(file as string, args);
  return new Promise((resolve) => {
    const child = spawn(launch.command, launch.args, {
      cwd,
      env: sessionEnv(),
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    let settled = false;
    let probing = false;
    const finish = (exitCode: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stopChild(child.pid);
      resolve({ exitCode, stdout: output, stderr: output });
    };
    const timer = setTimeout(() => finish(1), 90_000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString("utf8");
      const match = /https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/.exec(output);
      if (match?.[1] === undefined || probing) return;
      probing = true;
      void fetchReady(Number(match[1])).then((ready) => {
        if (ready) finish(0);
        else probing = false;
      });
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", () => {
      clearTimeout(timer);
      finish(1);
    });
  });
}

async function fetchReady(port: number): Promise<boolean> {
  for (const url of [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`]) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (response.status >= 200 && response.status < 500) return true;
    } catch {
      // Try the other loopback address. Vite may bind IPv6 only.
    }
  }
  return false;
}

function windowsCommand(
  command: string,
  args: readonly string[],
): { command: string; args: readonly string[] } {
  if (
    process.platform !== "win32" ||
    [".exe", ".com"].includes(path.win32.extname(command).toLowerCase())
  ) {
    return { command, args };
  }
  return { command: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/c", command, ...args] };
}

function stopChild(pid: number | undefined): void {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { shell: false, stdio: "ignore" });
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // The server already exited.
    }
  }
}
