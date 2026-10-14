import { describe, expect, it } from "vitest";
import {
  prepareTaskTextChanges,
  checkTaskAppliedContextFreshness,
  auditTaskApplication,
} from "./application.js";
import { taskContentHash } from "./canonical.js";
import { taskByteHash } from "./context-text.js";
import { HASH, RUN, makeTask } from "./fixtures.test-helper.js";
import type { TaskContext } from "./evidence-schema.js";
import type { TaskVerifierSnapshot } from "./verifier-files.js";

const context: TaskContext = {
  kind: "task_context",
  schemaVersion: 1,
  contextId: HASH,
  planId: HASH,
  taskId: "producer",
  inputRevision: HASH,
  sources: [],
  rules: [],
  predecessorArtifacts: [],
  size: { bytes: 0, estimatedInputTokens: 0, estimatorId: "test" },
  unresolvedReferences: [],
};
function preflight(changes: unknown[], text: string | null = "a\r\nb\r\n") {
  const task = makeTask("producer", "req-one", "src/a.ts");
  const payload = {
    kind: "change_set",
    schemaVersion: 1,
    planId: HASH,
    taskId: task.taskId,
    attemptId: `${RUN}/producer/1`,
    inputRevision: HASH,
    changes,
  };
  return prepareTaskTextChanges({
    proposal: { ...payload, changeSetId: taskContentHash(payload) },
    planId: HASH,
    task,
    attemptId: payload.attemptId,
    packet: {
      context,
      writeTargets: [{ path: "src/a.ts", fileHash: text === null ? null : taskByteHash(text) }],
    },
    preimages: [{ path: "src/a.ts", text }],
  });
}
const replace = (oldText = "b", newText = "c", text = "a\r\nb\r\n") => ({
  type: "replace_text",
  path: "src/a.ts",
  expectedFileHash: taskByteHash(text),
  oldText,
  newText,
});
describe("scoped text preflight", () => {
  it("preserves exact line endings and hashes creations/replacements", () => {
    const r = preflight([replace()]);
    expect(r.success && r.data[0]!.text).toBe("a\r\nc\r\n");
    const c = preflight(
      [{ type: "create_text", path: "src/a.ts", expectedState: "absent", content: "" }],
      null,
    );
    expect(c.success && c.data[0]!.afterHash).toBe(taskByteHash(""));
  });
  it.each(["missing", "a", "aa"])(
    "requires exactly one nonoverlapping or overlapping match: %s",
    (old) => {
      expect(preflight([replace(old, "x", "aaa")], "aaa").success).toBe(false);
    },
  );
  it("rejects duplicate, unowned, executable operation and stale identities", () => {
    expect(preflight([replace(), replace()]).success).toBe(false);
    expect(preflight([{ ...replace(), path: "src/b.ts" }]).success).toBe(false);
    expect(preflight([{ type: "run_command", command: "echo bad" }]).success).toBe(false);
    expect(preflight([{ ...replace(), expectedFileHash: HASH }]).success).toBe(false);
  });
  it("rejects existing creation, prohibited material, binary and oversized output", () => {
    expect(
      preflight([{ type: "create_text", path: "src/a.ts", expectedState: "absent", content: "c" }])
        .success,
    ).toBe(false);
    for (const text of ['const password = "real-secret"', "\0", "x".repeat(65537)])
      expect(preflight([replace("b", text)]).success).toBe(false);
  });
  it("owns postimages without relaxing immutable sources", async () => {
    const packet = {
      context: {
        ...context,
        sources: [
          {
            path: "src/a.ts",
            fileHash: taskByteHash("old"),
            selectionHash: taskByteHash("old"),
            byteLength: 3,
            inclusionReasons: ["write_target" as const],
            required: true,
          },
          {
            path: "src/rule.ts",
            fileHash: taskByteHash("rule"),
            selectionHash: taskByteHash("rule"),
            byteLength: 4,
            inclusionReasons: ["interface" as const],
            required: true,
          },
        ],
      },
      writeTargets: [{ path: "src/a.ts", fileHash: taskByteHash("old") }],
    };
    let rule = "rule";
    const reader = {
      inventory: async () => ({
        success: true as const,
        data: { rootIdentity: HASH, entries: [] },
      }),
      read: async (path: string) => {
        const text = path.endsWith("a.ts") ? "new" : rule;
        return { success: true as const, data: { text, fileHash: taskByteHash(text) } };
      },
    };
    expect(
      (
        await checkTaskAppliedContextFreshness(
          packet,
          [{ path: "src/a.ts", fileHash: taskByteHash("new") }],
          reader,
        )
      ).success,
    ).toBe(true);
    rule = "changed";
    expect(
      (
        await checkTaskAppliedContextFreshness(
          packet,
          [{ path: "src/a.ts", fileHash: taskByteHash("new") }],
          reader,
        )
      ).success,
    ).toBe(false);
  });
  it("audits unrelated files while permitting recorded parent metadata", () => {
    const before: TaskVerifierSnapshot = {
      schemaVersion: 1,
      rootIdentity: HASH,
      revision: HASH,
      rootFingerprint: HASH,
      entries: [{ path: "src", type: "directory", mode: "metadata", fingerprint: HASH }],
    };
    const after: TaskVerifierSnapshot = {
      ...before,
      entries: [
        { ...before.entries[0]!, fingerprint: taskByteHash("new") },
        { path: "src/a.ts", type: "file", mode: "content", fingerprint: HASH },
      ],
    };
    expect(auditTaskApplication(before, after, ["src/a.ts"], []).success).toBe(true);
    after.entries.push({
      path: "src/unrelated.ts",
      type: "file",
      mode: "content",
      fingerprint: HASH,
    });
    expect(auditTaskApplication(before, after, ["src/a.ts"], []).success).toBe(false);
  });
});
