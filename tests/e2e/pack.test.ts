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

describe("npm pack artifact", () => {
  it("packs the public CLI, inspects the tarball, and runs the installed binary", async () => {
    const packDir = await mkdtemp(path.join(os.tmpdir(), "reposetup-pack-out-"));
    tempDirs.push(packDir);
    const installDir = await createTempWorkspace("reposetup-pack-install-");
    tempDirs.push(installDir);

    const packed = await runProcess(
      "pnpm",
      ["--filter", "@pacharapolpimpa/reposetup", "pack", "--pack-destination", packDir],
      {
        cwd: repoRoot,
      },
    );
    expect(packed.exitCode, packed.stderr).toBe(0);

    const tarballs = (await readdir(packDir)).filter((name) => name.endsWith(".tgz")).sort();
    expect(tarballs).toEqual(["pacharapolpimpa-reposetup-0.1.0.tgz"]);

    const tarballPath = path.join(packDir, tarballs[0] as string);
    const listing = await runProcess("tar", ["-tzf", tarballPath], { cwd: packDir });
    expect(listing.exitCode, listing.stderr).toBe(0);
    expect(listing.stdout).toContain("package/package.json");
    expect(listing.stdout).toContain("package/dist/");
    expect(listing.stdout).toContain("package/LICENSE");
    expect(listing.stdout).toContain("package/README.md");
    expect(listing.stdout).not.toMatch(/package\/src\//);
    expect(listing.stdout).not.toContain(".test.");
    expect(listing.stdout).not.toContain("node_modules");
    expect(listing.stdout).not.toContain(".js.map");
    expect(listing.stdout.toLowerCase()).not.toContain(".env");

    const extracted = await mkdtemp(path.join(os.tmpdir(), "reposetup-pack-extract-"));
    tempDirs.push(extracted);
    const extract = await runProcess("tar", ["-xzf", tarballPath, "-C", extracted], {
      cwd: extracted,
    });
    expect(extract.exitCode, extract.stderr).toBe(0);
    const packedManifest = JSON.parse(
      await readFile(path.join(extracted, "package", "package.json"), "utf8"),
    ) as {
      name: string;
      version: string;
      bin?: { reposetup?: string };
      dependencies?: Record<string, string>;
    };
    expect(packedManifest.name).toBe("@pacharapolpimpa/reposetup");
    expect(packedManifest.version).toBe("0.1.0");
    expect(packedManifest.bin?.reposetup).toBe("./dist/bin.js");
    expect(packedManifest.dependencies?.["@reposetup/core"]).toBeUndefined();
    expect(packedManifest.dependencies?.["@reposetup/registry"]).toBeUndefined();
    expect(packedManifest.dependencies?.["@reposetup/integrations"]).toBeUndefined();
    expect(JSON.stringify(packedManifest.dependencies ?? {}).includes("workspace:")).toBe(false);

    const binSource = await readFile(path.join(extracted, "package", "dist", "bin.js"), "utf8");
    expect(binSource.startsWith("#!/usr/bin/env node")).toBe(true);
    expect(binSource).not.toContain("@reposetup/core");
    expect(binSource).not.toContain("@reposetup/registry");
    expect(binSource).not.toContain("@reposetup/integrations");
    expect(binSource).not.toContain("workspace:");

    const init = await runProcess("npm", ["init", "-y"], { cwd: installDir });
    expect(init.exitCode, init.stderr).toBe(0);
    const installed = await runProcess("npm", ["install", tarballPath], { cwd: installDir });
    expect(installed.exitCode, `${installed.stderr}\n${installed.stdout}`).toBe(0);

    const artifactBin = path.join(
      installDir,
      "node_modules",
      "@pacharapolpimpa",
      "reposetup",
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

    if (process.platform !== "win32") {
      const shim = path.join(installDir, "node_modules", ".bin", "reposetup");
      const shimVersion = await runProcess(shim, ["--version"], { cwd: installDir });
      expect(shimVersion.exitCode, shimVersion.stderr).toBe(0);
      expect(shimVersion.stdout.trim()).toBe(cliPackageVersion());
    }
  });
});
