import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import console from "node:console";
import { URL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { handoff } from "../src/handoff.ts";

const { commit, version } = handoff;
const root = fileURLToPath(new URL("../../../", import.meta.url));
const local = resolve(root, "apps/website/.local-cli");
const temp = mkdtempSync(join(tmpdir(), "reposetup-website-contract-"));
const run = (cmd, args, cwd = temp) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", env: process.env });
try {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Run this qualification tool with Node 24 on PATH.");
  run("git", ["archive", "--format=tar", "-o", join(temp, "source.tar"), commit], root);
  mkdirSync(join(temp, "source"));
  run("tar", ["-xf", join(temp, "source.tar"), "-C", join(temp, "source")]);
  run("pnpm", ["install", "--frozen-lockfile"], join(temp, "source"));
  run("pnpm", ["build"], join(temp, "source"));
  mkdirSync(local, { recursive: true });
  run("pnpm", ["--filter", "rsetup", "pack", "--pack-destination", local], join(temp, "source"));
  const tarball = join(local, `rsetup-${version}.tgz`);
  mkdirSync(join(local, "installed"), { recursive: true });
  run("npm", [
    "install",
    "--prefix",
    join(local, "installed"),
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    tarball,
  ]);
  mkdirSync(join(local, "bin"), { recursive: true });
  const bin = join(local, "installed/node_modules/rsetup/dist/bin.js");
  rmSync(join(local, "bin/reposetup"), { force: true });
  symlinkSync(bin, join(local, "bin/reposetup"));
  const tarballSha256 = createHash("sha256").update(readFileSync(tarball)).digest("hex");
  if (tarballSha256 !== handoff.artifactSha256)
    throw new Error("Packed CLI bytes differ from the candidate's pinned artifact hash.");
  const record = {
    commit,
    version,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    tarballSha256,
  };
  writeFileSync(join(local, "evidence.json"), JSON.stringify(record, null, 2) + "\n");
  console.log(`Exact committed CLI packed and installed locally: ${local}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
