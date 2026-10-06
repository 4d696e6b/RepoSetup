import * as z from "zod";
import { taskContentHash, freezeTaskValue } from "./canonical.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import { taskHashSchema, taskIdSchema, taskPathSchema, taskCounterSchema } from "./primitives.js";

export const TASK_VERIFIER_FILE_LIMITS = Object.freeze({
  maxEntries: 16384,
  maxDepth: 32,
  maxProjectFileBytes: 65536,
  maxDefinitionFileBytes: 268435456,
  maxDefinitionTotalBytes: 536870912,
});
/** Definition-bound temporary effects; bodies of the private Vitest token are never read. */
export const TASK_VERIFIER_SCRATCH_POLICY = freezeTaskValue({
  schemaVersion: 1,
  mode: 0o700,
  maxEntries: 4096,
  maxDepth: 32,
  maxBytes: 8388608,
  temporaryPrefix: "tmp",
  homePaths: {
    darwin: [
      "home",
      "home/Library",
      "home/Library/Application Support",
      "home/Library/Application Support/vitest",
      "home/Library/Application Support/vitest/.vitest-secret-token",
    ],
    linux: [
      "home",
      "home/.local",
      "home/.local/share",
      "home/.local/share/vitest",
      "home/.local/share/vitest/.vitest-secret-token",
    ],
  },
});
export const taskVerifierSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1),
  rootIdentity: taskHashSchema,
  revision: taskHashSchema,
  rootFingerprint: taskHashSchema,
  entries: z
    .array(
      z.strictObject({
        path: taskPathSchema,
        type: z.enum(["file", "directory", "symlink", "special"]),
        mode: z.enum(["content", "metadata"]),
        fingerprint: taskHashSchema,
      }),
    )
    .max(TASK_VERIFIER_FILE_LIMITS.maxEntries),
});
export const taskCheckFileDefinitionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  checkId: z.enum(["ts.typecheck", "ts.lint", "ts.unit"]),
  definitionRevision: taskHashSchema,
  recipeRevision: taskHashSchema,
  closureReviewId: taskIdSchema,
  files: z
    .array(
      z.strictObject({
        rootId: taskIdSchema,
        path: taskPathSchema,
        fileHash: taskHashSchema,
        role: z.enum(["runtime", "tool_entry", "dependency", "configuration", "rule", "oracle"]),
      }),
    )
    .min(1)
    .max(TASK_VERIFIER_FILE_LIMITS.maxEntries),
  roots: z
    .array(z.strictObject({ rootId: taskIdSchema, rootIdentity: taskHashSchema }))
    .min(1)
    .max(128),
  totalBytes: taskCounterSchema.max(TASK_VERIFIER_FILE_LIMITS.maxDefinitionTotalBytes),
});
export type TaskVerifierSnapshot = z.infer<typeof taskVerifierSnapshotSchema>;
export type TaskCheckFileDefinition = z.infer<typeof taskCheckFileDefinitionSchema>;
export function taskVerifierSnapshotHash(input: Omit<TaskVerifierSnapshot, "revision">): string {
  return taskContentHash({
    schemaVersion: input.schemaVersion,
    rootIdentity: input.rootIdentity,
    rootFingerprint: input.rootFingerprint,
    entries: [...input.entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  });
}
export function taskCheckFileDefinitionHash(
  input: Omit<TaskCheckFileDefinition, "definitionRevision">,
): string {
  return taskContentHash({
    ...input,
    roots: [...input.roots].sort((a, b) =>
      a.rootId < b.rootId ? -1 : a.rootId > b.rootId ? 1 : 0,
    ),
    files: [...input.files].sort((a, b) =>
      `${a.rootId}/${a.path}` < `${b.rootId}/${b.path}`
        ? -1
        : `${a.rootId}/${a.path}` > `${b.rootId}/${b.path}`
          ? 1
          : 0,
    ),
  });
}
/** Metadata-only exclusions never grant coding read authority. */
export function compareTaskVerifierSnapshots(
  beforeInput: unknown,
  afterInput: unknown,
): TaskParseResult<{
  unchanged: boolean;
  rootChanged: boolean;
  unexpectedChanges: string[];
}> {
  const before = taskVerifierSnapshotSchema.safeParse(beforeInput);
  const after = taskVerifierSnapshotSchema.safeParse(afterInput);
  if (!before.success || !after.success)
    return taskFailure("TASK_CHECK_BLOCKED", "Verifier snapshots are invalid.");
  for (const snapshot of [before.data, after.data]) {
    const { revision, ...payload } = snapshot;
    if (
      new Set(snapshot.entries.map((e) => e.path)).size !== snapshot.entries.length ||
      taskVerifierSnapshotHash(payload) !== revision
    )
      return taskFailure("TASK_CHECK_BLOCKED", "Verifier snapshot identity or paths conflict.");
  }
  if (before.data.rootIdentity !== after.data.rootIdentity)
    return taskFailure("TASK_PROJECT_DRIFT", "Verifier project identity changed.");
  const left = new Map(before.data.entries.map((e) => [e.path, e]));
  const right = new Map(after.data.entries.map((e) => [e.path, e]));
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort();
  const unexpectedChanges = paths.filter(
    (p) => taskContentHash(left.get(p) ?? null) !== taskContentHash(right.get(p) ?? null),
  );
  return {
    success: true,
    data: freezeTaskValue({
      unchanged:
        unexpectedChanges.length === 0 &&
        before.data.rootFingerprint === after.data.rootFingerprint,
      rootChanged: before.data.rootFingerprint !== after.data.rootFingerprint,
      unexpectedChanges,
    }),
  };
}
/** Secret filenames must not be read even for definition hashing. */
export function isPrivateVerifierPath(relative: string): boolean {
  const parts = relative.toLowerCase().split("/");
  const name = parts.at(-1) ?? "";
  return (
    parts.some((p) => [".ssh", ".aws", ".azure", ".gcloud", ".git"].includes(p)) ||
    (name.startsWith(".env") && name !== ".env.example") ||
    /^(?:\.netrc|\.npmrc|\.pypirc|\.git-credentials|credentials.*|service-account.*\.json|id_(?:rsa|ed25519)|.*\.(?:pem|key|p12|pfx))$/.test(
      name,
    )
  );
}
