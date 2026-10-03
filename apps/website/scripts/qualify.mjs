import { spawnSync, execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  copyFileSync,
  lstatSync,
  readlinkSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { URL, fileURLToPath } from "node:url";
import { join } from "node:path";
import process from "node:process";
import console from "node:console";
import { verifyArtifact } from "./verify-artifact.ts";

if (Number(process.versions.node.split(".")[0]) < 24)
  throw new Error("Website qualification requires Node 24 on PATH.");
if (process.argv.slice(2).some((arg) => arg !== "--local"))
  throw new Error("Use no arguments for the full matrix, or --local for Chrome/Firefox only.");
const scope = process.argv.includes("--local") ? "local" : "full";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const app = join(root, "apps/website");
const startedAt = new Date().toISOString();
const directory = join(app, "qualification", `${startedAt.replaceAll(":", "-")}-${scope}`);
mkdirSync(directory, { recursive: true });
const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
function workingTreeHash() {
  const files = git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean)
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const path = join(root, file);
    hash.update(file + "\0");
    if (!existsSync(path)) hash.update("deleted");
    else if (lstatSync(path).isSymbolicLink()) hash.update("link:" + readlinkSync(path));
    else hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}
const source = {
  commit: git(["rev-parse", "HEAD"]),
  dirty: !!git(["status", "--porcelain"]),
  workingTreeSha256: workingTreeHash(),
};
const report = {
  schemaVersion: 1,
  startedAt,
  finishedAt: null,
  source,
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  scope,
  lockfileSha256: sha256(join(root, "pnpm-lock.yaml")),
  cli: null,
  catalog: null,
  assets: [],
  checks: [],
  automatedScopePassed: false,
  wholeReleaseQualified: false,
  remainingGates: [
    scope === "local" ? "WebKit desktop/mobile" : "Full five-profile browser matrix",
    "Five observed beginner sessions",
    "Manual screen-reader and physical-device checks",
    "Real CLI journey/native-platform and maintenance qualification",
    "Frozen candidate/repeated passes/soak and explicit delivery authorization",
  ],
};
const save = () =>
  writeFileSync(join(directory, "report.json"), JSON.stringify(report, null, 2) + "\n");
let failed = false;
function check(name, args) {
  console.log(`Website qualification: ${name}`);
  const result = spawnSync("pnpm", args, {
    cwd: root,
    shell: false,
    encoding: "utf8",
    timeout: 15 * 60 * 1000,
    maxBuffer: 20 * 1024 * 1024,
    env: process.env,
  });
  writeFileSync(join(directory, `${name}.log`), (result.stdout ?? "") + (result.stderr ?? ""));
  const passed = !result.error && result.status === 0;
  report.checks.push({
    name,
    passed,
    exitCode: result.status,
    error: result.error?.message ?? null,
  });
  if (!passed) {
    failed = true;
    console.error(`${name} failed. See ${join(directory, `${name}.log`)}`);
  }
  save();
  return passed;
}
try {
  report.cli = verifyArtifact(join(app, ".local-cli"));
  save();
  for (const [name, args] of [
    ["build", ["build"]],
    ["unit", ["test"]],
    ["typecheck", ["typecheck"]],
    ["lint", ["lint"]],
    ["handoff", ["--filter", "@reposetup/website", "test:handoff"]],
    [
      "browser",
      ["--filter", "@reposetup/website", scope === "full" ? "test:browser" : "test:browser:local"],
    ],
  ]) {
    if (!check(name, args)) break;
  }
  if (report.checks.some((item) => item.name === "browser"))
    copyFileSync(
      join(app, "test-results/browser-report.json"),
      join(directory, "browser-report.json"),
    );
  const catalog = JSON.parse(readFileSync(join(app, "src/generated/catalog.json"), "utf8"));
  report.catalog = {
    revision: catalog.revision,
    recipeRevision: catalog.recipeRevision,
    cliContract: catalog.cliContract,
    sha256: sha256(join(app, "src/generated/catalog.json")),
  };
  report.assets = readdirSync(join(app, "dist/assets")).map((name) => ({
    name,
    sha256: sha256(join(app, "dist/assets", name)),
  }));
  if (
    source.commit !== git(["rev-parse", "HEAD"]) ||
    source.workingTreeSha256 !== workingTreeHash()
  )
    throw new Error("Source state changed during qualification. Run again from a stable checkout.");
  report.automatedScopePassed = !failed && report.checks.length === 6;
  if (scope === "full" && report.automatedScopePassed)
    report.remainingGates = report.remainingGates.filter(
      (gate) => gate !== "Full five-profile browser matrix",
    );
} catch (error) {
  failed = true;
  report.checks.push({ name: "identity/evidence", passed: false, error: String(error) });
  console.error(String(error));
} finally {
  report.finishedAt = new Date().toISOString();
  save();
  console.log(`Qualification evidence: ${join(directory, "report.json")}`);
  process.exitCode = failed ? 1 : 0;
}
