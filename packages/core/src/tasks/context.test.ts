import { describe, expect, it } from "vitest";
import { makeCompilation, HASH, RUN } from "./fixtures.test-helper.js";
import {
  compileTaskPlan,
  prepareTaskContext,
  checkTaskContextFreshness,
  taskByteHash,
  decodeTaskText,
  selectTaskLines,
  hasTaskSecretMaterial,
  scanLocalTaskImports,
  isTaskPathExcluded,
  type TaskRepositoryReader,
  type TaskMaterializedContext,
} from "./index.js";

function fixture(extra: Record<string, string> = {}) {
  const files: Record<string, string> = {
    "docs/phase.md": "Implement both requirements.\n",
    "src/contracts.ts": 'import { helper } from "./helper.js";\nexport const result = helper();\n',
    "src/helper.ts": "export const helper = () => 1;\n",
    "src/contracts.test.ts": "// Public nearby test\n",
    "src/unrelated.ts": "// Must not enter context\n",
    ...extra,
  };
  const input = makeCompilation();
  input.phase.sourceFileHash = taskByteHash(files["docs/phase.md"]!);
  input.phase.selectionHash = input.phase.sourceFileHash;
  input.phase.lineRange = { start: 1, end: 1 };
  input.draft.selectionHash = input.phase.selectionHash;
  for (const requirement of input.phase.requirements)
    requirement.sourceRefs[0]!.fileHash = input.phase.sourceFileHash;
  for (const task of input.draft.tasks)
    task.scope.read.push({ type: "subtree", path: "docs" }, { type: "file", path: "AGENTS.md" });
  input.policy.authority.read.push(
    { type: "subtree", path: "docs" },
    { type: "subtree", path: "AGENTS.md" },
  );
  const compiled = compileTaskPlan(input);
  if (!compiled.success) throw compiled.error;
  const reads: string[] = [];
  const repository: TaskRepositoryReader = {
    async inventory() {
      return {
        success: true,
        data: {
          rootIdentity: HASH,
          entries: Object.keys(files)
            .filter((path) => !isTaskPathExcluded(path, "read"))
            .sort()
            .map((path) => ({ path, type: "file", byteLength: Buffer.byteLength(files[path]!) })),
        },
      };
    },
    async read(path) {
      reads.push(path);
      const text = files[path];
      return {
        success: true,
        data: text === undefined ? null : { text, fileHash: taskByteHash(text) },
      };
    },
  };
  return { files, reads, repository, input, plan: compiled.data };
}
function packet(result: Awaited<ReturnType<typeof prepareTaskContext>>): TaskMaterializedContext {
  if (!result.success) throw result.error;
  return result.data;
}
const prepare = (
  f: ReturnType<typeof fixture>,
  options: Partial<Parameters<typeof prepareTaskContext>[0]> = {},
) =>
  prepareTaskContext({
    plan: f.plan,
    policy: f.input.policy,
    taskId: "producer",
    repository: f.repository,
    ...options,
  });

describe("bounded task context", () => {
  it("rebases only executor-owned writable requirement inputs and keeps model requested hashes exact", async () => {
    const f = fixture();
    f.input.phase.requirements[0]!.sourceRefs.push({
      path: "src/contracts.ts",
      fileHash: taskByteHash(f.files["src/contracts.ts"]!),
    });
    const plan = compileTaskPlan(f.input);
    if (!plan.success) throw plan.error;
    f.files["src/contracts.ts"] = "export const result = 3;\n";
    expect(await prepare(f, { plan: plan.data })).toMatchObject({
      success: false,
      error: { code: "TASK_CONTEXT_STALE" },
    });
    const revision = {
      path: "src/contracts.ts",
      fileHash: taskByteHash(f.files["src/contracts.ts"]),
    };
    expect(await prepare(f, { plan: plan.data, ownedWriteRevisions: [revision] })).toMatchObject({
      success: true,
    });
    expect(
      await prepare(f, {
        plan: plan.data,
        ownedWriteRevisions: [revision],
        requests: [{ path: revision.path, fileHash: HASH }],
      }),
    ).toMatchObject({ success: false, error: { code: "TASK_CONTEXT_STALE" } });
    expect(
      await prepare(f, { ownedWriteRevisions: [{ path: "docs/phase.md", fileHash: HASH }] }),
    ).toMatchObject({ success: false, error: { code: "TASK_SCOPE_VIOLATION" } });
    expect(
      await prepare(f, { ownedWriteRevisions: [{ path: "src/helper.ts", fileHash: HASH }] }),
    ).toMatchObject({ success: false, error: { code: "TASK_SCOPE_VIOLATION" } });
  });
  it("includes complete applicable rules even when an explicit request selects only one line", async () => {
    const f = fixture({ "AGENTS.md": "First rule.\nSecond mandatory rule.\n" });
    const value = packet(
      await prepare(f, {
        requests: [
          {
            path: "AGENTS.md",
            fileHash: taskByteHash(f.files["AGENTS.md"]!),
            lineRange: { start: 1, end: 1 },
          },
        ],
      }),
    );
    expect(value.files.find((file) => file.path === "AGENTS.md")!.text).toBe(f.files["AGENTS.md"]);
    expect(
      value.context.sources.find((source) => source.path === "AGENTS.md")!.lineRange,
    ).toBeUndefined();
  });
  it("blocks oversized inventory before any source read", async () => {
    const f = fixture();
    f.repository.inventory = async () => ({
      success: true,
      data: {
        rootIdentity: HASH,
        entries: Array.from({ length: 4097 }, (_, index) => ({
          path: `src/file-${index}.ts`,
          type: "file",
          byteLength: 0,
        })),
      },
    });
    const result = await prepare(f);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_CONTEXT_LIMIT_EXCEEDED");
    expect(f.reads).toEqual([]);
  });
  it("blocks missing or invalid explicitly required references instead of silently dropping them", async () => {
    const f = fixture();
    expect(
      (await prepare(f, { requests: [{ path: "docs/absent.md", fileHash: HASH }] })).success,
    ).toBe(false);
    expect(
      (
        await prepare(f, {
          requests: [
            {
              path: "docs/phase.md",
              fileHash: taskByteHash(f.files["docs/phase.md"]!),
              lineRange: { start: 2, end: 3 },
            },
          ],
        })
      ).success,
    ).toBe(false);
  });
  it("selects requirements, write preimages, nearby tests, imports and applicable rules without unrelated bodies", async () => {
    const f = fixture({
      "AGENTS.md": "Use pure functions.\n",
      "src/AGENTS.md": "Preserve public types.\n",
      "src/.env": "PRIVATE_MARKER",
    });
    const value = packet(await prepare(f));
    expect(value.files.map((file) => file.path)).toEqual([
      "AGENTS.md",
      "docs/phase.md",
      "src/AGENTS.md",
      "src/contracts.test.ts",
      "src/contracts.ts",
      "src/helper.ts",
    ]);
    expect(f.reads).not.toContain("src/unrelated.ts");
    expect(f.reads).not.toContain("src/.env");
    expect(
      value.context.rules.some(
        (rule) =>
          rule.path === "src/AGENTS.md" && rule.applicabilityScope.path === "src/contracts.ts",
      ),
    ).toBe(true);
    expect(value.context.size.bytes).toBe(Buffer.byteLength(JSON.stringify(value)));
    expect(value.context.size.estimatedInputTokens).toBe(value.context.size.bytes);
    expect(Object.isFrozen(value.files)).toBe(true);
    expect(JSON.stringify(value.context)).not.toContain("export const result");
  });
  it("produces deterministic identities regardless of inventory enumeration", async () => {
    const a = fixture();
    const b = fixture();
    const inventory = b.repository.inventory;
    b.repository.inventory = async (scope) => {
      const result = await inventory(scope);
      if (result.success) result.data.entries.reverse();
      return result;
    };
    expect(packet(await prepare(a))).toEqual(packet(await prepare(b)));
  });
  it("records expected-absent write targets and rejects later creation", async () => {
    const f = fixture();
    delete f.files["src/contracts.ts"];
    const value = packet(await prepare(f));
    expect(value.writeTargets).toEqual([{ path: "src/contracts.ts", fileHash: null }]);
    f.files["src/contracts.ts"] = "export {};";
    const result = await checkTaskContextFreshness(value, f.repository);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_CONTEXT_STALE");
  });
  it("rejects stale source/phase identities, root drift and missing required source", async () => {
    for (const mode of ["changed", "missing", "root"] as const) {
      const f = fixture();
      if (mode === "changed") f.files["docs/phase.md"] = "changed\n";
      if (mode === "missing") delete f.files["docs/phase.md"];
      if (mode === "root")
        f.repository.inventory = async () => ({
          success: true,
          data: { rootIdentity: taskByteHash("another-root"), entries: [] },
        });
      const result = await prepare(f);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.code).toBe(
          mode === "changed"
            ? "TASK_CONTEXT_STALE"
            : mode === "missing"
              ? "TASK_CONTEXT_UNRESOLVED"
              : "TASK_PROJECT_DRIFT",
        );
    }
  });
  it("rejects body/file and full packet overflow without truncating required content", async () => {
    const f = fixture({ "src/contracts.ts": "x".repeat(65537) });
    expect((await prepare(f)).success).toBe(false);
    const limited = await prepare(fixture(), { maxContextBytes: 100 });
    expect(limited.success).toBe(false);
    if (!limited.success) expect(limited.error.code).toBe("TASK_CONTEXT_LIMIT_EXCEEDED");
  });
  it("rejects explicit excluded source requests before reading a body", async () => {
    const f = fixture({ "src/.env": "DO_NOT_EXPOSE" });
    const result = await prepare(f, {
      requests: [{ path: "src/.env", fileHash: taskByteHash(f.files["src/.env"]!) }],
    });
    expect(result.success).toBe(false);
    expect(f.reads).not.toContain("src/.env");
    expect(JSON.stringify(result)).not.toContain("DO_NOT_EXPOSE");
  });
  it("blocks secret content even when it is in a permitted source or an unselected line", async () => {
    const f = fixture({
      "src/contracts.ts": 'export const api_key = "synthetic-private-value";\n',
    });
    const result = await prepare(f);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain("synthetic-private-value");
  });
  it("requires existing ancestor rules to be permitted and blocks rule inventory drift", async () => {
    const stable = fixture();
    const original = packet(await prepare(stable));
    stable.files["AGENTS.md"] = "New required rule.";
    expect((await checkTaskContextFreshness(original, stable.repository)).success).toBe(false);
    const f = fixture({ "AGENTS.md": "Review safety.\n" });
    f.input.draft.tasks[0]!.scope.read = f.input.draft.tasks[0]!.scope.read.filter(
      (selector) => selector.path !== "AGENTS.md",
    );
    const compiled = compileTaskPlan(f.input);
    if (!compiled.success) throw compiled.error;
    expect((await prepare(f, { plan: compiled.data })).success).toBe(false);
    const changing = fixture();
    let calls = 0;
    const inventory = changing.repository.inventory;
    changing.repository.inventory = async (scope) => {
      if (++calls === 2) changing.files["AGENTS.md"] = "New rule.";
      return inventory(scope);
    };
    const result = await prepare(changing);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_CONTEXT_STALE");
  });
  it("keeps unresolved imports explicit and bounds expansion", async () => {
    const f = fixture({
      "src/helper.ts": 'import "./second";\nimport(variable);\n',
      "src/second.ts": 'import "./third";\n',
      "src/third.ts": "// Must not expand beyond depth 2\n",
    });
    const value = packet(await prepare(f));
    expect(value.files.map((file) => file.path)).not.toContain("src/third.ts");
    expect(value.context.unresolvedReferences.length).toBeGreaterThan(0);
    expect(
      value.context.unresolvedReferences.every((reference) => reference.required === false),
    ).toBe(true);
  });
  it("binds accepted predecessor path revisions and blocks missing/stale/forged artifacts", async () => {
    const f = fixture();
    const artifact = {
      producerTaskId: "producer",
      artifactId: "producer-output",
      attemptId: `${RUN}/producer/1`,
      acceptanceRevision: HASH,
      verificationId: HASH,
      paths: [{ path: "src/contracts.ts", fileHash: taskByteHash(f.files["src/contracts.ts"]!) }],
    };
    expect((await prepare(f, { taskId: "consumer" })).success).toBe(false);
    const value = packet(await prepare(f, { taskId: "consumer", acceptedArtifacts: [artifact] }));
    expect(value.context.predecessorArtifacts).toEqual([artifact]);
    expect(
      (
        await prepare(f, {
          taskId: "consumer",
          acceptedArtifacts: [
            { ...artifact, paths: [{ path: "src/unrelated.ts", fileHash: HASH }] },
          ],
        })
      ).success,
    ).toBe(false);
    expect(
      (
        await prepare(f, {
          taskId: "consumer",
          acceptedArtifacts: [
            { ...artifact, paths: [{ path: "src/contracts.ts", fileHash: HASH }] },
          ],
        })
      ).success,
    ).toBe(false);
  });
  it("merges exact ranges and retains all inclusion reasons", async () => {
    const f = fixture({ "docs/extra.md": "first\r\nsecond\r\nthird" });
    const hash = taskByteHash(f.files["docs/extra.md"]!);
    const value = packet(
      await prepare(f, {
        requests: [
          { path: "docs/extra.md", fileHash: hash, lineRange: { start: 1, end: 1 } },
          { path: "docs/extra.md", fileHash: hash, lineRange: { start: 2, end: 2 } },
        ],
      }),
    );
    expect(value.files.find((file) => file.path === "docs/extra.md")!.text).toBe(
      "first\r\nsecond\r\n",
    );
    expect(
      value.context.sources.find((source) => source.path === "src/contracts.ts")!.inclusionReasons,
    ).toContain("write_target");
  });
  it("rejects a source changing between selection and final freshness", async () => {
    const f = fixture();
    const read = f.repository.read;
    let calls = 0;
    f.repository.read = async (path) => {
      if (path === "src/contracts.ts" && ++calls === 3) f.files[path] = "changed";
      return read(path);
    };
    expect((await prepare(f)).success).toBe(false);
  });
});
describe("source decoding and conservative discovery", () => {
  it("preserves BOM, CRLF and final line bytes; rejects invalid UTF-8, binary control bytes and missing ranges", () => {
    const text = "\ufefffirst\r\nlast";
    expect(decodeTaskText(Buffer.from(text))).toBe(text);
    expect(selectTaskLines(text, { start: 1, end: 1 })).toBe("\ufefffirst\r\n");
    expect(selectTaskLines(text, { start: 2, end: 2 })).toBe("last");
    expect(() => selectTaskLines("first\n", { start: 2, end: 2 })).toThrow();
    expect(() => decodeTaskText(new Uint8Array([0xc3, 0x28]))).toThrow();
    expect(() => decodeTaskText(Buffer.from("a\0b"))).toThrow();
  });
  it("ignores comments/string decoys and handles static imports, exports and requires without evaluation", () => {
    const text =
      '// import "./private";\nconst s = "import ./decoy";\nimport type { X } from "./types"; export { y } from "./y"; const z = require("./z"); import("./lazy");';
    expect(scanLocalTaskImports(text)).toEqual({
      specifiers: ["./lazy", "./types", "./y", "./z"],
      computed: false,
    });
  });
  it("screens key material and credential assignments while permitting documented placeholders", () => {
    expect(hasTaskSecretMaterial("-----BEGIN PRIVATE KEY-----")).toBe(true);
    expect(hasTaskSecretMaterial('API_KEY="your_api_key"')).toBe(false);
    expect(hasTaskSecretMaterial("PASSWORD=changeme")).toBe(false);
    expect(hasTaskSecretMaterial("API_KEY=private-credential-value")).toBe(true);
    expect(hasTaskSecretMaterial("password=private-credential-value")).toBe(true);
    expect(
      hasTaskSecretMaterial(
        "interface Input { password: string }; const password = input.password;",
      ),
    ).toBe(false);
  });
});
