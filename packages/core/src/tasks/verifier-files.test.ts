import { describe, expect, it } from "vitest";
import { HASH } from "./fixtures.test-helper.js";
import {
  compareTaskVerifierSnapshots,
  taskVerifierSnapshotHash,
  taskCheckFileDefinitionHash,
  taskCheckFileDefinitionSchema,
  isPrivateVerifierPath,
  TASK_VERIFIER_FILE_LIMITS,
  type TaskVerifierSnapshot,
} from "./verifier-files.js";
function snapshot(entries: TaskVerifierSnapshot["entries"] = []) {
  const payload = { schemaVersion: 1 as const, rootIdentity: HASH, rootFingerprint: HASH, entries };
  return { ...payload, revision: taskVerifierSnapshotHash(payload) };
}
describe("verifier file contracts", () => {
  it("compares complete inventories and catches adds, deletes, content and audit-mode changes", () => {
    const entry = {
      path: "src/a.ts",
      type: "file" as const,
      mode: "content" as const,
      fingerprint: HASH,
    };
    expect(compareTaskVerifierSnapshots(snapshot([entry]), snapshot([entry]))).toMatchObject({
      success: true,
      data: { unchanged: true },
    });
    for (const entries of [
      [],
      [entry, { ...entry, path: "src/b.ts" }],
      [{ ...entry, fingerprint: `sha256:${"b".repeat(64)}` }],
      [{ ...entry, mode: "metadata" as const }],
    ])
      expect(compareTaskVerifierSnapshots(snapshot([entry]), snapshot(entries))).toMatchObject({
        success: true,
        data: { unchanged: false },
      });
  });
  it("detects root metadata effects even when no surviving path changed", () => {
    const after = snapshot();
    after.rootFingerprint = `sha256:${"b".repeat(64)}`;
    after.revision = taskVerifierSnapshotHash(after);
    expect(compareTaskVerifierSnapshots(snapshot(), after)).toMatchObject({
      success: true,
      data: { unchanged: false, rootChanged: true, unexpectedChanges: [] },
    });
  });
  it("rejects tampered, duplicated, future and mismatched-root snapshots", () => {
    expect(
      compareTaskVerifierSnapshots(snapshot(), {
        ...snapshot(),
        revision: `sha256:${"b".repeat(64)}`,
      }).success,
    ).toBe(false);
    expect(
      compareTaskVerifierSnapshots(snapshot(), { ...snapshot(), schemaVersion: 2 }).success,
    ).toBe(false);
    const entry = {
      path: "a",
      type: "file" as const,
      mode: "metadata" as const,
      fingerprint: HASH,
    };
    expect(compareTaskVerifierSnapshots(snapshot([entry, entry]), snapshot()).success).toBe(false);
    const other = snapshot();
    other.rootIdentity = `sha256:${"b".repeat(64)}`;
    other.revision = taskVerifierSnapshotHash(other);
    expect(compareTaskVerifierSnapshots(snapshot(), other)).toMatchObject({
      success: false,
      error: { code: "TASK_PROJECT_DRIFT" },
    });
  });
  it("rejects inventory overflow rather than accepting truncated evidence", () => {
    const entries: TaskVerifierSnapshot["entries"] = Array.from(
      { length: TASK_VERIFIER_FILE_LIMITS.maxEntries + 1 },
      (_, index) => ({ path: `file-${index}`, type: "file", mode: "metadata", fingerprint: HASH }),
    );
    expect(compareTaskVerifierSnapshots(snapshot(entries), snapshot()).success).toBe(false);
  });
  it("hashes definition closures independently of file/root ordering and forbids executable fields", () => {
    const payload = {
      schemaVersion: 1 as const,
      checkId: "ts.unit" as const,
      recipeRevision: HASH,
      closureReviewId: "review-one",
      files: [
        {
          rootId: "project",
          path: "vitest.config.mjs",
          fileHash: HASH,
          role: "configuration" as const,
        },
        { rootId: "tool", path: "vitest.mjs", fileHash: HASH, role: "tool_entry" as const },
      ],
      roots: [
        { rootId: "project", rootIdentity: HASH },
        { rootId: "tool", rootIdentity: HASH },
      ],
      totalBytes: 2,
    };
    expect(taskCheckFileDefinitionHash(payload)).toBe(
      taskCheckFileDefinitionHash({
        ...payload,
        files: [...payload.files].reverse(),
        roots: [...payload.roots].reverse(),
      }),
    );
    expect(
      taskCheckFileDefinitionSchema.safeParse({
        ...payload,
        definitionRevision: taskCheckFileDefinitionHash(payload),
        command: "anything",
      }).success,
    ).toBe(false);
  });
  it("does not allow private filenames in a closure", () => {
    for (const name of [
      ".env",
      "sub/.env.local",
      ".aws/config",
      "credentials.json",
      "id_ed25519",
      ".npmrc",
      "key.pem",
    ])
      expect(isPrivateVerifierPath(name)).toBe(true);
    expect(isPrivateVerifierPath("package.json")).toBe(false);
    expect(isPrivateVerifierPath(".env.example")).toBe(false);
  });
});
