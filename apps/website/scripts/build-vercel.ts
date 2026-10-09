import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const baseline = "a213a6a1edf63771aba8d5b91bfdcf44d665de22";
if (process.env.VERCEL_GIT_COMMIT_REF !== "codex/0.2.3-website")
  throw new Error("Refusing website build from an unapproved branch");

const workspace = JSON.parse(
  readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
) as { packageManager: string };
if (workspace.packageManager !== "pnpm@12.5.1")
  throw new Error("Review the pinned Vercel package manager before changing it.");
const run = (command: string, args: string[]) =>
  execFileSync(command, args, { cwd: root, stdio: "inherit", shell: false });
try {
  run("git", ["cat-file", "-e", `${baseline}^{commit}`]);
} catch {
  // Vercel may clone a shallow history; the release guard needs this exact base.
  run("git", ["fetch", "--depth=1", "origin", baseline]);
}
run("npx", [
  "--yes",
  workspace.packageManager,
  "--filter",
  "@reposetup/website...",
  "--recursive",
  "--if-present",
  "build",
]);
run("npx", ["--yes", workspace.packageManager, "--filter", "@reposetup/website", "vercel:prepare"]);
