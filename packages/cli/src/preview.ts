import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import {
  isSafeProjectRelativePath,
  previewOperations,
  type ChangePreview,
  type InstallationOperation,
  type PreviewSnapshot,
  type RepoSetupError,
} from "@reposetup/core";

const MAX_PREVIEW_FILE_BYTES = 64 * 1024;
const MANIFEST_WATCH_FILES = [
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "bun.lock",
  "pyproject.toml",
  "uv.lock",
  "requirements.txt",
] as const;

export interface CapturedPreview {
  preview: ChangePreview;
  fingerprint: string;
}

/** Read-only adapter. Refuses symlink paths and never returns file contents to renderers. */
export async function capturePreview(
  rootDir: string,
  operations: readonly InstallationOperation[],
): Promise<CapturedPreview> {
  const paths = [
    ...new Set(
      operations.flatMap((operation) => {
        if ("path" in operation) return [operation.path];
        if (operation.type === "install_package" || operation.type === "run_command") {
          return MANIFEST_WATCH_FILES.map((file) => path.posix.join(operation.cwd, file));
        }
        return [];
      }),
    ),
  ].sort();
  const snapshots: Record<string, PreviewSnapshot> = {};
  const fingerprints: unknown[] = [];
  try {
    if ((await lstat(rootDir)).isSymbolicLink()) {
      throw new Error("Project root is a symlink.");
    }
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  for (const relativePath of paths) {
    if (!isSafeProjectRelativePath(relativePath)) {
      snapshots[relativePath] = { kind: "blocked", reason: "Unsafe project-relative path." };
      fingerprints.push([relativePath, "unsafe"]);
      continue;
    }
    const absolute = path.resolve(rootDir, relativePath);
    const parts = path.relative(path.resolve(rootDir), absolute).split(path.sep);
    let current = path.resolve(rootDir);
    let blocked = false;
    for (const part of parts) {
      current = path.join(current, part);
      try {
        const info = await lstat(current);
        if (info.isSymbolicLink()) {
          snapshots[relativePath] = {
            kind: "blocked",
            reason: "Symlink boundary requires manual review.",
          };
          fingerprints.push([relativePath, "symlink"]);
          blocked = true;
          break;
        }
        if (current !== absolute && !info.isDirectory()) {
          snapshots[relativePath] = {
            kind: "blocked",
            reason: "A parent path is not a directory.",
          };
          fingerprints.push([relativePath, "parent-not-directory"]);
          blocked = true;
          break;
        }
      } catch (error) {
        if (!isMissing(error)) throw error;
        break;
      }
    }
    if (blocked) continue;
    try {
      const info = await lstat(absolute);
      if (info.isDirectory()) {
        snapshots[relativePath] = { kind: "directory" };
        fingerprints.push([relativePath, "directory", info.mtimeMs]);
      } else if (info.isFile()) {
        if (info.size > MAX_PREVIEW_FILE_BYTES) {
          snapshots[relativePath] = { kind: "file" };
          fingerprints.push([relativePath, "large-file", info.size, info.mtimeMs]);
        } else {
          const content = await readFile(absolute, "utf8");
          snapshots[relativePath] = { kind: "file", content };
          fingerprints.push([
            relativePath,
            "file",
            createHash("sha256").update(content).digest("hex"),
          ]);
        }
      } else {
        snapshots[relativePath] = {
          kind: "blocked",
          reason: "Target is not a regular file or directory.",
        };
        fingerprints.push([relativePath, "special"]);
      }
    } catch (error) {
      if (!isMissing(error)) throw error;
      snapshots[relativePath] = { kind: "missing" };
      fingerprints.push([relativePath, "missing"]);
    }
  }
  return {
    preview: previewOperations(operations, snapshots),
    fingerprint: createHash("sha256").update(JSON.stringify(fingerprints)).digest("hex"),
  };
}

export async function recheckPreview(
  rootDir: string,
  operations: readonly InstallationOperation[],
  captured: CapturedPreview,
): Promise<RepoSetupError | undefined> {
  try {
    const current = await capturePreview(rootDir, operations);
    return current.fingerprint === captured.fingerprint && !current.preview.blocked
      ? undefined
      : previewError("changed");
  } catch (error) {
    return previewError("read", error instanceof Error ? error.message : undefined);
  }
}

export function renderPreview(preview: ChangePreview): string {
  const lines = ["Change preview:"];
  for (const change of preview.changes)
    lines.push(
      `  ${change.category.padEnd(8)} ${change.target}: ${change.before} → ${change.after}. ${change.reason}`,
    );
  if (preview.changes.length === 0) lines.push("  (no file or dependency changes)");
  lines.push(
    "File contents and secret values are suppressed. External tool effects are unknown until execution.",
  );
  return lines.join("\n");
}

export function previewError(
  reason: "blocked" | "changed" | "read",
  detail?: string,
): RepoSetupError {
  return {
    code: reason === "read" ? "FILE_MUTATION_FAILED" : "PLAN_INVALID",
    message:
      reason === "blocked"
        ? "Change preview found a file conflict or unsafe path. No changes were made."
        : reason === "changed"
          ? "Project files changed after preview. Run the command again to review a fresh plan."
          : "Could not inspect files for a safe change preview.",
    ...(detail === undefined ? {} : { details: { reason: detail } }),
    suggestion: "Review the affected paths and run --diff --dry-run again.",
  };
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
