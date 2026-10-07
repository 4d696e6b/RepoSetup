import type { Task } from "./plan-schema.js";
import type { z } from "zod";
import { isSafeTaskPath, type taskSelectorSchema } from "./primitives.js";

export type TaskSelector = z.infer<typeof taskSelectorSchema>;
const excludedSegments = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "generated",
  ".next",
  ".nuxt",
  ".cache",
  ".reposetup",
  "holdout",
  ".ssh",
  ".aws",
  ".azure",
  ".gcloud",
]);
const protectedFiles = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "npm-shrinkwrap.json",
  "bun.lock",
  "bun.lockb",
  "yarn.lock",
  ".npmrc",
  ".pnpmfile.cjs",
  "reposetup.json",
  "reposetup.tasks.json",
  "agents.md",
  "claude.md",
]);
export function taskSelectorContains(selector: TaskSelector, path: string): boolean {
  return (
    path === selector.path || (selector.type === "subtree" && path.startsWith(`${selector.path}/`))
  );
}
export function isTaskPathExcluded(path: string, mode: "read" | "write"): boolean {
  if (!isSafeTaskPath(path)) return true;
  const parts = path.toLowerCase().split("/");
  const name = parts.at(-1)!;
  if (
    parts.some((part) => excludedSegments.has(part)) ||
    parts.includes(".agents") ||
    parts.includes(".cursor") ||
    parts.includes(".codex") ||
    parts.includes(".hooks") ||
    /^(?:\.netrc|\.npmrc|\.pypirc|\.git-credentials|credentials.*|service-account.*\.json|id_(?:rsa|ed25519)|.*\.(?:pem|key|p12|pfx))$/.test(
      name,
    ) ||
    (name.startsWith(".env") && name !== ".env.example")
  )
    return true;
  if (/\.(?:png|jpg|jpeg|gif|webp|pdf|zip|gz|wasm|exe|dll|so|dylib|bin)$/.test(name)) return true;
  if (mode === "read") return false;
  return (
    protectedFiles.has(name) ||
    /^(?:tsconfig.*\.json|eslint\.config\..*|\.eslintrc.*|vitest\.config\..*|vite\.config\..*)$/.test(
      name,
    ) ||
    parts.includes(".github") ||
    parts.includes("scripts") ||
    parts.includes("test-public") ||
    (parts.includes("test") && parts.includes("public")) ||
    /\.(?:png|jpg|jpeg|gif|webp|pdf|zip|gz|wasm|exe|dll|so|dylib|bin)$/.test(name)
  );
}
export function taskCanRead(task: Pick<Task, "scope">, path: string): boolean {
  return (
    !isTaskPathExcluded(path, "read") &&
    !task.scope.deny.some((selector) => taskSelectorContains(selector, path)) &&
    task.scope.read.some((selector) => taskSelectorContains(selector, path))
  );
}
export function taskCanWrite(task: Task, path: string): boolean {
  return (
    !isTaskPathExcluded(path, "write") && taskCanRead(task, path) && task.scope.write.includes(path)
  );
}
