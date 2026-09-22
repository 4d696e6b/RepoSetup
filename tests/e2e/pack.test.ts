import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupWorkspace,
  cliPackageVersion,
  createTempWorkspace,
  keepOnFailure,
  repoRoot,
  runNodeCli,
  runProcess,
} from "./harness.js";

const tempDirs: string[] = [];

afterEach(async () => {
  const keep = keepOnFailure();
  await Promise.all(tempDirs.splice(0).map((dir) => cleanupWorkspace(dir, keep)));
});

const PUBLIC_PACKAGES = [
  "@reposetup/core",
  "@reposetup/registry",
  "@reposetup/integrations",
  "@reposetup/cli",
] as const;

describe("npm pack artifact", () => {
  it("packs public packages, inspects tarballs, and runs the installed CLI", async () => {
    const packDir = await mkdtemp(path.join(os.tmpdir(), "reposetup-pack-out-"));
    tempDirs.push(packDir);
    const installDir = await createTempWorkspace("reposetup-pack-install-");
    tempDirs.push(installDir);

    const packed = await runProcess(
      "pnpm",
      ["-r", "--filter", "./packages/**", "pack", "--pack-destination", packDir],
      { cwd: repoRoot },
    );
    expect(packed.exitCode, packed.stderr).toBe(0);

    const tarballs = (await readdir(packDir)).filter((name) => name.endsWith(".tgz")).sort();
    expect(tarballs.length).toBe(4);

    for (const name of tarballs) {
      const listing = await runProcess("tar", ["-tzf", path.join(packDir, name)], { cwd: packDir });
      expect(listing.exitCode, listing.stderr).toBe(0);
      expect(listing.stdout).toContain("package/package.json");
      expect(listing.stdout).toContain("package/dist/");
      expect(listing.stdout).toContain("package/LICENSE");
      expect(listing.stdout).toContain("package/README.md");
      expect(listing.stdout).not.toMatch(/package\/src\//);
      expect(listing.stdout).not.toContain(".test.");
      expect(listing.stdout).not.toContain("node_modules");
      expect(listing.stdout.toLowerCase()).not.toContain(".env");
    }

    const cliTarball = tarballs.find((name) => name.startsWith("reposetup-cli-"));
    expect(cliTarball).toBeDefined();
    const extracted = await mkdtemp(path.join(os.tmpdir(), "reposetup-pack-extract-"));
    tempDirs.push(extracted);
    const extract = await runProcess(
      "tar",
      ["-xzf", path.join(packDir, cliTarball as string), "-C", extracted],
      { cwd: extracted },
    );
    expect(extract.exitCode, extract.stderr).toBe(0);
    const packedManifest = JSON.parse(
      await readFile(path.join(extracted, "package", "package.json"), "utf8"),
    ) as {
      name: string;
      version: string;
      bin?: { reposetup?: string };
      dependencies?: Record<string, string>;
    };
    expect(packedManifest.name).toBe("@reposetup/cli");
    expect(packedManifest.version).toBe("0.1.0-alpha.1");
    expect(packedManifest.bin?.reposetup).toBe("./dist/bin.js");
    for (const name of PUBLIC_PACKAGES.filter((id) => id !== "@reposetup/cli")) {
      const range = packedManifest.dependencies?.[name];
      expect(range, `${name} must not use workspace protocol`).toBeDefined();
      expect(range?.includes("workspace:")).toBe(false);
    }

    const init = await runProcess("npm", ["init", "-y"], { cwd: installDir });
    expect(init.exitCode, init.stderr).toBe(0);
    const tarballPaths = tarballs.map((name) => path.join(packDir, name));
    const installed = await runProcess("npm", ["install", ...tarballPaths], { cwd: installDir });
    expect(installed.exitCode, `${installed.stderr}\n${installed.stdout}`).toBe(0);

    const artifactBin = path.join(
      installDir,
      "node_modules",
      "@reposetup",
      "cli",
      "dist",
      "bin.js",
    );
    const help = await runNodeCli(artifactBin, ["--help"], { cwd: installDir });
    expect(help.exitCode, help.stderr).toBe(0);
    expect(help.stdout).toContain("Usage: reposetup");

    const version = await runNodeCli(artifactBin, ["--version"], { cwd: installDir });
    expect(version.exitCode, version.stderr).toBe(0);
    expect(version.stdout.trim()).toBe(cliPackageVersion());

    const search = await runNodeCli(artifactBin, ["search", "prisma"], { cwd: installDir });
    expect(search.exitCode, search.stderr).toBe(0);
    expect(search.stdout).toContain("prisma");

    const info = await runNodeCli(artifactBin, ["info", "prisma"], { cwd: installDir });
    expect(info.exitCode, info.stderr).toBe(0);
    expect(info.stdout).toContain("status            candidate");

    const dryRun = await runNodeCli(
      artifactBin,
      [
        "create",
        "--config",
        path.join(repoRoot, "examples/reposetup.next-sqlite.json"),
        "--dry-run",
      ],
      { cwd: installDir },
    );
    expect(dryRun.exitCode, dryRun.stderr).toBe(0);
    expect(dryRun.stdout).toContain("No files or commands were executed.");
  });
});
