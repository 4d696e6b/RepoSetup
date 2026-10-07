import { describe, it, expect } from "vitest";
import { prepareTaskCompilationContext } from "./compilation-context.js";
import { taskByteHash } from "./context-text.js";
import { TASK_CHECK_IDS, TASK_REQUIRED_CHECK_IDS } from "./primitives.js";
import type { TaskReview } from "./review-schema.js";
import type { TaskRepositoryReader } from "./context-types.js";
const hash = taskByteHash("fixture");
function fixture() {
  const files: Record<string, string> = {
    "docs/phase.md": "# Phase\nBuild the public function.\nUnselected tail.\n",
    "src/main.ts": "export const main = true;\n",
    "src/unrelated.ts": "UNRELATED_BODY",
    "AGENTS.md": "Root rules.\nSecond rule.\n",
  };
  const phaseHash = taskByteHash(files["docs/phase.md"]!);
  const review: TaskReview = {
    kind: "task_review",
    schemaVersion: 1,
    project: { rootIdentity: hash, baselineCommit: "b".repeat(40), baselineTreeHash: hash },
    phase: {
      phaseId: "phase",
      sourcePath: "docs/phase.md",
      sourceFileHash: phaseHash,
      lineRange: { start: 1, end: 2 },
      selectionHash: taskByteHash("# Phase\nBuild the public function.\n"),
      requirements: [
        {
          requirementId: "requirement",
          text: "Build public function.",
          sourceRefs: [
            { path: "docs/phase.md", fileHash: phaseHash, lineRange: { start: 2, end: 2 } },
          ],
          phaseCriterionIds: ["phase-criterion"],
        },
      ],
      phaseCriteria: [
        {
          criterionId: "phase-criterion",
          statement: "Public function accepted independently.",
          evidenceKind: "reviewer_evidence",
          checkId: "phase.acceptance",
        },
      ],
    },
    policy: {
      supportProfileId: "managed-ts-node-v1",
      supportProfileRevision: 1,
      checkCatalogRevision: hash,
      checkIds: [...TASK_CHECK_IDS],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      authority: {
        read: [
          { type: "subtree", path: "src" },
          { type: "subtree", path: "docs" },
          { type: "file", path: "AGENTS.md" },
        ],
        write: ["src/main.ts"],
        deny: [],
      },
      caseSensitivePaths: true,
    },
  };
  const repository: TaskRepositoryReader = {
    inventory: async () => ({
      success: true,
      data: {
        rootIdentity: hash,
        entries: Object.entries(files).map(([path, text]) => ({
          path,
          type: "file",
          byteLength: Buffer.byteLength(text),
        })),
      },
    }),
    read: async (path) => ({
      success: true,
      data:
        files[path] === undefined
          ? null
          : { text: files[path], fileHash: taskByteHash(files[path]) },
    }),
  };
  return {
    files,
    review,
    repository,
    prepare: () => prepareTaskCompilationContext({ review, repository }),
  };
}
describe("bounded decomposition context", () => {
  it("includes selected requirements, complete rules and write preimages; subtree body expansion stays explicit", async () => {
    const f = fixture(),
      r = await f.prepare();
    expect(r.success).toBe(true);
    if (!r.success) throw new Error(r.error.message);
    expect(r.data.files).toEqual([
      { path: "AGENTS.md", text: f.files["AGENTS.md"] },
      { path: "docs/phase.md", text: "# Phase\nBuild the public function.\n" },
      { path: "src/main.ts", text: f.files["src/main.ts"] },
    ]);
    expect(JSON.stringify(r.data.files)).not.toContain("UNRELATED_BODY");
    expect(r.data.inventory.some((i) => i.path === "src/unrelated.ts")).toBe(true);
    expect(await f.prepare()).toEqual(r);
  });
  it("blocks an applicable rule outside authority rather than silently omitting it", async () => {
    const f = fixture();
    f.review.policy.authority.read.pop();
    expect(await f.prepare()).toMatchObject({
      success: false,
      error: { code: "TASK_SCOPE_VIOLATION" },
    });
  });
  it("blocks changed reviewed phase, secrets, source bounds and invalid selection", async () => {
    const changed = fixture();
    changed.files["docs/phase.md"] += "Changed.\n";
    expect(await changed.prepare()).toMatchObject({
      success: false,
      error: { code: "TASK_CONTEXT_STALE" },
    });
    const secret = fixture();
    secret.files["src/main.ts"] = 'const password = "super-secret-value";\n';
    expect((await secret.prepare()).success).toBe(false);
    const large = fixture();
    large.files["src/main.ts"] = "x".repeat(65537);
    expect((await large.prepare()).success).toBe(false);
    const range = fixture();
    range.review.phase.lineRange.end = 100;
    expect((await range.prepare()).success).toBe(false);
  });
  it("rebinds context identity when write preimages or applicable rule inventory change", async () => {
    const f = fixture(),
      original = await f.prepare();
    if (!original.success) throw new Error(original.error.message);
    f.files["src/main.ts"] += "Changed.\n";
    const updated = await f.prepare();
    if (!updated.success) throw new Error(updated.error.message);
    expect(updated.data.contextId).not.toBe(original.data.contextId);
    f.files["src/AGENTS.md"] = "New required rules.\n";
    const rules = await f.prepare();
    if (!rules.success) throw new Error(rules.error.message);
    expect(rules.data.contextId).not.toBe(updated.data.contextId);
    expect(rules.data.files.some((p) => p.path === "src/AGENTS.md")).toBe(true);
  });
});
