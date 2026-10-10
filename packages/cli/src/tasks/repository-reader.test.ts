import { afterEach, describe as describeOnAllPlatforms, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink, link, rename, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { taskByteHash, type TaskSelector } from "@reposetup/core";
import { createTaskRepositoryReader } from "./repository-reader.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
const authority = {
  read: [
    { type: "subtree", path: "src" },
    { type: "file", path: "AGENTS.md" },
  ] as TaskSelector[],
  deny: [] as TaskSelector[],
};
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "reposetup-context-"));
  roots.push(root);
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "src/source.ts"), "\ufeffexport {};\r\n");
  const result = await createTaskRepositoryReader(root, authority);
  if (!result.success) throw result.error;
  return { root, reader: result.data };
}
// Real task filesystem fixtures target the initial Linux/macOS profile.
// Windows task execution remains unsupported; pure core/provider tests still run.
const describe = describeOnAllPlatforms.skipIf(process.platform === "win32");

describe("read-only task repository adapter", () => {
  it("copies reviewed reader authority and enforces deny selectors", async () => {
    const { root } = await fixture();
    const mutable = {
      read: [...authority.read],
      deny: [{ type: "file", path: "src/source.ts" }] as TaskSelector[],
    };
    const result = await createTaskRepositoryReader(root, mutable);
    if (!result.success) throw result.error;
    mutable.deny.length = 0;
    expect((await result.data.read("src/source.ts")).success).toBe(false);
  });
  it("blocks overly deep inventories and direct paths", async () => {
    const { root, reader } = await fixture();
    const relative = `src/${Array.from({ length: 33 }, () => "nested").join("/")}`;
    await mkdir(path.join(root, relative), { recursive: true });
    await writeFile(path.join(root, relative, "file.ts"), "export {};\n");
    expect((await reader.read(`${relative}/file.ts`)).success).toBe(false);
    const result = await reader.inventory(authority);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_CONTEXT_LIMIT_EXCEEDED");
  });
  it("returns bounded byte-exact text/hash, deterministic metadata and expected absence without writes", async () => {
    const { root, reader } = await fixture();
    const before = await readFile(path.join(root, "src/source.ts"));
    const result = await reader.read("src/source.ts");
    expect(result).toEqual({
      success: true,
      data: { text: before.toString(), fileHash: taskByteHash(before) },
    });
    expect(await reader.read("src/new/absent.ts")).toEqual({ success: true, data: null });
    const inventory = await reader.inventory(authority);
    expect(inventory.success).toBe(true);
    if (inventory.success)
      expect(inventory.data.entries.map((entry) => entry.path)).toEqual(["src", "src/source.ts"]);
    expect(await readFile(path.join(root, "src/source.ts"))).toEqual(before);
  });
  it("excludes environment, dependency, generated, binary and private oracle paths before reading bodies", async () => {
    const { root, reader } = await fixture();
    for (const directory of ["node_modules", "dist", "holdout"]) {
      await mkdir(path.join(root, "src", directory));
      await writeFile(path.join(root, "src", directory, "secret.ts"), "PRIVATE_MARKER");
    }
    for (const filename of [".env", "credentials.json", "image.png"])
      await writeFile(path.join(root, "src", filename), "PRIVATE_MARKER");
    const inventory = await reader.inventory(authority);
    expect(inventory.success).toBe(true);
    if (inventory.success)
      expect(inventory.data.entries.map((entry) => entry.path)).toEqual(["src", "src/source.ts"]);
    for (const filename of [
      ".env",
      "credentials.json",
      "image.png",
      "node_modules/secret.ts",
      "holdout/secret.ts",
    ]) {
      const result = await reader.read(`src/${filename}`);
      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).not.toContain("PRIVATE_MARKER");
    }
  });
  it("denies scope expansion and detects ancestor rules by metadata without granting their bodies", async () => {
    const { root } = await fixture();
    await writeFile(path.join(root, "AGENTS.md"), "Root instruction");
    const restricted = await createTaskRepositoryReader(root, {
      read: [authority.read[0]!],
      deny: [],
    });
    if (!restricted.success) throw restricted.error;
    const inventory = await restricted.data.inventory({ read: [authority.read[0]!], deny: [] });
    expect(inventory.success).toBe(true);
    if (inventory.success)
      expect(inventory.data.entries.map((entry) => entry.path)).toContain("AGENTS.md");
    expect((await restricted.data.read("AGENTS.md")).success).toBe(false);
    expect(
      (await restricted.data.inventory({ read: [{ type: "subtree", path: "docs" }], deny: [] }))
        .success,
    ).toBe(false);
    expect((await restricted.data.read("../outside.ts")).success).toBe(false);
  });
  it("rejects symlink files, symlink ancestors and hardlink aliases", async () => {
    const { root, reader } = await fixture();
    const outside = await mkdtemp(path.join(tmpdir(), "reposetup-private-"));
    roots.push(outside);
    await writeFile(path.join(outside, "private.ts"), "PRIVATE_MARKER");
    await symlink(path.join(outside, "private.ts"), path.join(root, "src/linked.ts"));
    await symlink(outside, path.join(root, "src/linked-dir"));
    await link(path.join(root, "src/source.ts"), path.join(root, "src/hard.ts"));
    for (const target of ["src/linked.ts", "src/linked-dir/private.ts", "src/hard.ts"])
      expect((await reader.read(target)).success).toBe(false);
    expect((await reader.inventory(authority)).success).toBe(false);
  });
  it("rejects invalid UTF-8, binary controls, oversized files and credentials in ordinary source", async () => {
    const { root, reader } = await fixture();
    for (const bytes of [
      Buffer.from([0xc3, 0x28]),
      Buffer.from("binary\0value"),
      Buffer.alloc(65537, 120),
      Buffer.from('const api_key = "PRIVATE_MARKER";'),
    ]) {
      await writeFile(path.join(root, "src/source.ts"), bytes);
      const result = await reader.read("src/source.ts");
      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).not.toContain("PRIVATE_MARKER");
    }
  });
  it("rejects replacement of the canonical root", async () => {
    const { root, reader } = await fixture();
    const moved = `${root}-old`;
    roots.push(moved);
    await rename(root, moved);
    await mkdir(root);
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src/source.ts"), "replacement");
    expect((await reader.read("src/source.ts")).success).toBe(false);
    expect((await reader.inventory(authority)).success).toBe(false);
  });
  it("rejects unsafe lexical authority and descendant traversal", async () => {
    const { root, reader } = await fixture();
    expect(
      (
        await createTaskRepositoryReader(root, {
          read: [{ type: "subtree", path: "../src" }],
          deny: [],
        })
      ).success,
    ).toBe(false);
    expect((await reader.read("src/../src/source.ts")).success).toBe(false);
  });
});

it("prepares a compiled plan through the real reader while preserving project files", async () => {
  const { root } = await fixture();
  await mkdir(path.join(root, "docs"));
  await writeFile(path.join(root, "docs/phase.md"), "Preserve the public contract.\n");
  await writeFile(path.join(root, "AGENTS.md"), "Keep changes small.\n");
  const core = await import("@reposetup/core");
  const readScope: TaskSelector[] = [...authority.read, { type: "subtree", path: "docs" }];
  const readerResult = await createTaskRepositoryReader(root, { read: readScope, deny: [] });
  if (!readerResult.success) throw readerResult.error;
  const reader = readerResult.data;
  const phaseBytes = await readFile(path.join(root, "docs/phase.md"));
  const phaseHash = taskByteHash(phaseBytes);
  const hash = taskByteHash("reviewed-catalog");
  const policy = {
    supportProfileId: "managed-ts-node-v1",
    supportProfileRevision: 1,
    checkCatalogRevision: hash,
    checkIds: [...core.TASK_CHECK_IDS],
    requiredCheckIds: [...core.TASK_REQUIRED_CHECK_IDS],
    authority: { read: readScope, write: ["src/source.ts"], deny: [] },
    caseSensitivePaths: true,
  };
  const phase = {
    phaseId: "phase-one",
    sourcePath: "docs/phase.md",
    sourceFileHash: phaseHash,
    lineRange: { start: 1, end: 1 },
    selectionHash: phaseHash,
    requirements: [
      {
        requirementId: "req-one",
        text: "Preserve the public contract.",
        sourceRefs: [{ path: "docs/phase.md", fileHash: phaseHash }],
        phaseCriterionIds: ["phase-criterion"],
      },
    ],
    phaseCriteria: [
      {
        criterionId: "phase-criterion",
        statement: "Independent acceptance passes.",
        evidenceKind: "trusted_check",
        checkId: "phase.acceptance",
      },
    ],
  };
  const task = {
    taskId: "edit",
    objective: "Preserve exported types.",
    requirementIds: ["req-one"],
    kind: "implementation",
    constraints: [],
    scope: { read: readScope, write: ["src/source.ts"], deny: [] },
    criteria: [
      {
        criterionId: "task-criterion",
        statement: "Public types remain compatible.",
        requirementIds: ["req-one"],
        evidenceKind: "trusted_check",
        checkIds: ["task.acceptance"],
      },
    ],
    requiredCheckIds: [...core.TASK_REQUIRED_CHECK_IDS],
    outputs: [
      {
        artifactId: "source-output",
        kind: "file_snapshot",
        paths: ["src/source.ts"],
        criterionIds: ["task-criterion"],
      },
    ],
    capabilityRequirements: {
      features: ["local_logic"],
      minimumCapabilityClass: "baseline",
      evidenceRefs: [{ type: "requirement", requirementId: "req-one" }],
    },
  };
  const compiled = core.compileTaskPlan({
    phase,
    policy,
    project: {
      rootIdentity: reader.rootIdentity,
      baselineCommit: "b".repeat(40),
      baselineTreeHash: hash,
    },
    draft: {
      kind: "task_plan_draft",
      schemaVersion: 1,
      phaseId: "phase-one",
      selectionHash: phaseHash,
      tasks: [task],
      dependencies: [],
      unresolvedQuestions: [],
    },
  });
  if (!compiled.success) throw compiled.error;
  const before = await readFile(path.join(root, "src/source.ts"));
  const result = await core.prepareTaskContext({
    plan: compiled.data,
    policy,
    taskId: "edit",
    repository: reader,
  });
  expect(result.success, result.success ? undefined : result.error.message).toBe(true);
  if (result.success) {
    expect(result.data.files.map((file) => file.path)).toEqual([
      "AGENTS.md",
      "docs/phase.md",
      "src/source.ts",
    ]);
    expect(result.data.context.size.bytes).toBe(Buffer.byteLength(JSON.stringify(result.data)));
    expect(core.parseTaskDocument(result.data.context).success).toBe(true);
    expect(result.data.context.rules.some((rule) => rule.path === "AGENTS.md")).toBe(true);
  }
  expect(await readFile(path.join(root, "src/source.ts"))).toEqual(before);
});
