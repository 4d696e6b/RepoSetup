import { describe as describeOnAllPlatforms, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  realpath,
  rm,
  symlink,
  link,
  rename,
  chmod,
  lstat,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  taskByteHash,
  taskCheckFileDefinitionHash,
  compareTaskVerifierSnapshots,
  type TaskCheckFileDefinition,
  type TaskParseResult,
} from "@reposetup/core";
import { createDefaultProcessRunner } from "../execution-adapters.js";
import { createTaskVerifierSnapshotReader } from "./verifier-snapshot.js";
import { prepareTaskReportReader } from "./verifier-report.js";
import { verifyTaskCheckFileDefinition } from "./verifier-definition.js";
import { captureVerifierRoot, readVerifierFile } from "./verifier-read.js";
function data<T>(result: TaskParseResult<T>): T {
  if (!result.success) throw new Error(result.error.code);
  return result.data;
}
async function fixture() {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "reposetup-verifier-files-")));
  return { root, dispose: () => rm(root, { recursive: true, force: true }) };
}
// Real task filesystem fixtures target the initial Linux/macOS profile.
// Windows task execution remains unsupported; pure core/provider tests still run.
const describe = describeOnAllPlatforms.skipIf(process.platform === "win32");

describe("verifier filesystem boundaries", () => {
  it("audits public content and private/ignored metadata without following an external symlink", async () => {
    const f = await fixture();
    const outside = await fixture();
    try {
      await mkdir(path.join(f.root, "src"));
      await writeFile(path.join(f.root, "src/a.ts"), "export const value = 1;\n");
      await writeFile(path.join(f.root, ".env"), Buffer.from([0xff, 0xfe, 0xfd]));
      await mkdir(path.join(f.root, "node_modules"));
      await writeFile(path.join(f.root, "node_modules/excluded"), Buffer.alloc(100000));
      await writeFile(path.join(outside.root, "private"), "outside-private-marker");
      await symlink(outside.root, path.join(f.root, "outside-link"));
      const reader = data(await createTaskVerifierSnapshotReader(f.root));
      const before = data(await reader.snapshot());
      expect(before.entries.find((e) => e.path === "src/a.ts")?.mode).toBe("content");
      expect(before.entries.find((e) => e.path === ".env")?.mode).toBe("metadata");
      expect(before.entries.find((e) => e.path === "node_modules/excluded")?.mode).toBe("metadata");
      expect(before.entries.find((e) => e.path === "outside-link")?.type).toBe("symlink");
      expect(before.entries.some((e) => e.path.includes("private"))).toBe(false);
      expect(
        data(compareTaskVerifierSnapshots(before, data(await reader.snapshot()))).unchanged,
      ).toBe(true);
      await writeFile(path.join(f.root, "src/a.ts"), "export const value = 2;\n");
      expect(
        data(compareTaskVerifierSnapshots(before, data(await reader.snapshot()))).unexpectedChanges,
      ).toContain("src/a.ts");
      const middle = data(await reader.snapshot());
      await writeFile(path.join(f.root, ".env"), Buffer.from([0xff]));
      expect(
        data(compareTaskVerifierSnapshots(middle, data(await reader.snapshot()))).unexpectedChanges,
      ).toContain(".env");
      expect(await readFile(path.join(outside.root, "private"), "utf8")).toBe(
        "outside-private-marker",
      );
    } finally {
      await f.dispose();
      await outside.dispose();
    }
  });
  it("detects additions, removals, mode changes and root replacement without rollback", async () => {
    const f = await fixture();
    const parent = await fixture();
    try {
      await writeFile(path.join(f.root, "a.ts"), "one\n");
      const reader = data(await createTaskVerifierSnapshotReader(f.root));
      const before = data(await reader.snapshot());
      await writeFile(path.join(f.root, "new.ts"), "new\n");
      await rm(path.join(f.root, "a.ts"));
      expect(
        data(compareTaskVerifierSnapshots(before, data(await reader.snapshot()))).unexpectedChanges,
      ).toEqual(["a.ts", "new.ts"]);
      const middle = data(await reader.snapshot());
      await chmod(path.join(f.root, "new.ts"), 0o600);
      expect(
        data(compareTaskVerifierSnapshots(middle, data(await reader.snapshot()))).unchanged,
      ).toBe(false);
      await rename(f.root, path.join(parent.root, "old"));
      await mkdir(f.root);
      expect((await reader.snapshot()).success).toBe(false);
    } finally {
      await f.dispose();
      await parent.dispose();
    }
  });
  it("detects a real verifier process write even when the process exits successfully", async () => {
    const f = await fixture();
    try {
      const reader = data(await createTaskVerifierSnapshotReader(f.root));
      const before = data(await reader.snapshot());
      const result = await createDefaultProcessRunner()({
        command: process.execPath,
        args: ["-e", "require('node:fs').writeFileSync('surprise.txt', 'unexpected effect')"],
        cwd: f.root,
        env: { PATH: path.dirname(process.execPath), CI: "1" },
        timeoutMs: 10000,
      });
      expect(result.exitCode).toBe(0);
      expect(
        data(compareTaskVerifierSnapshots(before, data(await reader.snapshot()))).unexpectedChanges,
      ).toContain("surprise.txt");
      expect(await readFile(path.join(f.root, "surprise.txt"), "utf8")).toBe("unexpected effect");
    } finally {
      await f.dispose();
    }
  });
  it("blocks oversized, binary, secret-bearing and hardlinked eligible public files", async () => {
    const f = await fixture();
    try {
      const reader = data(await createTaskVerifierSnapshotReader(f.root));
      const file = path.join(f.root, "a.ts");
      for (const bytes of [
        Buffer.alloc(65537, 97),
        Buffer.from([0xff]),
        Buffer.from('const password = "private-value";'),
      ]) {
        await writeFile(file, bytes);
        const result = await reader.snapshot();
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).not.toContain("private-value");
      }
      await writeFile(file, "safe\n");
      await link(file, path.join(f.root, "b.ts"));
      expect((await reader.snapshot()).success).toBe(false);
    } finally {
      await f.dispose();
    }
  });
  it("allows reviewed metadata exclusions only while still auditing their changes", async () => {
    const f = await fixture();
    try {
      await writeFile(path.join(f.root, "large.fixture"), Buffer.alloc(100000));
      const reader = data(
        await createTaskVerifierSnapshotReader(f.root, [{ type: "file", path: "large.fixture" }]),
      );
      const before = data(await reader.snapshot());
      await writeFile(path.join(f.root, "large.fixture"), Buffer.alloc(100001));
      expect(
        data(compareTaskVerifierSnapshots(before, data(await reader.snapshot()))).unexpectedChanges,
      ).toContain("large.fixture");
      expect(
        (await createTaskVerifierSnapshotReader(f.root, [{ type: "file", path: "../outside" }]))
          .success,
      ).toBe(false);
    } finally {
      await f.dispose();
    }
  });
  it("blocks excessive inventory depth without silently skipping nested paths", async () => {
    const f = await fixture();
    try {
      let directory = f.root;
      for (let index = 0; index < 33; index++) {
        directory = path.join(directory, "nested");
        await mkdir(directory);
      }
      const reader = data(await createTaskVerifierSnapshotReader(f.root));
      expect((await reader.snapshot()).success).toBe(false);
    } finally {
      await f.dispose();
    }
  });
  it("reads each fresh private report once with fatal UTF-8, byte bounds and permission checks", async () => {
    const f = await fixture();
    try {
      for (const [index, body] of [
        '{"success":true}',
        Buffer.from([0xff]),
        Buffer.alloc(131073),
      ].entries()) {
        const directory = path.join(f.root, `scratch-${index}`);
        await mkdir(directory, { mode: 0o700 });
        const reader = data(await prepareTaskReportReader(directory));
        await writeFile(path.join(directory, "unit-report.json"), body);
        const result = await reader.read();
        if (index === 0) expect(data(result)).toBe('{"success":true}');
        else expect(result.success).toBe(false);
        expect((await reader.read()).success).toBe(false);
        expect((await prepareTaskReportReader(directory)).success).toBe(false);
      }
      const missing = data(await prepareTaskReportReader(f.root));
      expect((await missing.read()).success).toBe(false);
      const permissions = path.join(f.root, "permission-scratch");
      await mkdir(permissions, { mode: 0o700 });
      const reader = data(await prepareTaskReportReader(permissions));
      await writeFile(path.join(permissions, "unit-report.json"), "{}");
      await chmod(permissions, 0o755);
      expect((await reader.read()).success).toBe(false);
    } finally {
      await f.dispose();
    }
  });
  it("rejects report symlinks, hardlinks and replacement scratch directories", async () => {
    const f = await fixture();
    const outside = await fixture();
    try {
      const target = path.join(outside.root, "file");
      await writeFile(target, "outside-private-marker");
      for (const kind of ["symlink", "hardlink", "replacement"] as const) {
        const directory = path.join(f.root, kind);
        await mkdir(directory, { mode: 0o700 });
        const reader = data(await prepareTaskReportReader(directory));
        const report = path.join(directory, "unit-report.json");
        if (kind === "symlink") await symlink(target, report);
        else if (kind === "hardlink") await link(target, report);
        else {
          await rename(directory, path.join(outside.root, "old"));
          await mkdir(directory, { mode: 0o700 });
          await writeFile(report, "{}");
        }
        expect((await reader.read()).success).toBe(false);
      }
      expect(await readFile(target, "utf8")).toBe("outside-private-marker");
    } finally {
      await f.dispose();
      await outside.dispose();
    }
  });
  it("validates reviewed runtime/tool/config/dependency/rule/oracle bytes and detects transitive tampering", async () => {
    const f = await fixture();
    try {
      const roles = [
        "runtime",
        "tool_entry",
        "configuration",
        "dependency",
        "rule",
        "oracle",
      ] as const;
      const files: TaskCheckFileDefinition["files"] = [];
      for (const role of roles) {
        const text = `${role}\n`;
        await writeFile(path.join(f.root, `${role}.txt`), text);
        files.push({ rootId: "trusted", path: `${role}.txt`, fileHash: taskByteHash(text), role });
      }
      const payload = {
        schemaVersion: 1 as const,
        checkId: "ts.unit" as const,
        recipeRevision: taskByteHash("recipe"),
        closureReviewId: "review-one",
        roots: [{ rootId: "trusted", rootIdentity: taskByteHash(f.root) }],
        files,
        totalBytes: roles.reduce((sum, role) => sum + Buffer.byteLength(`${role}\n`), 0),
      };
      const definition = { ...payload, definitionRevision: taskCheckFileDefinitionHash(payload) };
      const verified = data(
        await verifyTaskCheckFileDefinition(
          definition,
          { trusted: f.root },
          payload.recipeRevision,
        ),
      );
      expect(Object.isFrozen(verified.files)).toBe(true);
      for (const role of ["dependency", "configuration", "rule", "oracle"] as const) {
        await writeFile(path.join(f.root, `${role}.txt`), "tampered\n");
        expect(
          await verifyTaskCheckFileDefinition(
            definition,
            { trusted: f.root },
            payload.recipeRevision,
          ),
        ).toMatchObject({ success: false, error: { code: "TASK_CHECK_DEFINITION_CHANGED" } });
        await writeFile(path.join(f.root, `${role}.txt`), `${role}\n`);
      }
      expect(
        (
          await verifyTaskCheckFileDefinition(
            definition,
            { trusted: f.root },
            taskByteHash("other recipe"),
          )
        ).success,
      ).toBe(false);
      expect(
        (
          await verifyTaskCheckFileDefinition(
            { ...definition, command: "anything" },
            { trusted: f.root },
            payload.recipeRevision,
          )
        ).success,
      ).toBe(false);
      expect(
        (await verifyTaskCheckFileDefinition(definition, { wrong: f.root }, payload.recipeRevision))
          .success,
      ).toBe(false);
      for (const files of [
        payload.files.concat(payload.files[0]!),
        payload.files.filter((file) => file.role !== "runtime"),
        [...payload.files, { ...payload.files[0]!, path: ".env" }],
      ]) {
        const altered = { ...payload, files };
        expect(
          (
            await verifyTaskCheckFileDefinition(
              { ...altered, definitionRevision: taskCheckFileDefinitionHash(altered) },
              { trusted: f.root },
              payload.recipeRevision,
            )
          ).success,
        ).toBe(false);
      }
      const wrongBytes = { ...payload, totalBytes: payload.totalBytes + 1 };
      expect(
        (
          await verifyTaskCheckFileDefinition(
            { ...wrongBytes, definitionRevision: taskCheckFileDefinitionHash(wrongBytes) },
            { trusted: f.root },
            payload.recipeRevision,
          )
        ).success,
      ).toBe(false);
    } finally {
      await f.dispose();
    }
  });
  it("does not follow definition symlink components or read credential files", async () => {
    const f = await fixture();
    const outside = await fixture();
    try {
      await writeFile(path.join(outside.root, "outside"), "private\n");
      await symlink(outside.root, path.join(f.root, "alias"));
      const root = await captureVerifierRoot(f.root);
      await expect(readVerifierFile(root, "alias/outside", 64)).rejects.toThrow();
      await writeFile(path.join(f.root, "a"), "safe\n");
      await link(path.join(f.root, "a"), path.join(f.root, "b"));
      await expect(readVerifierFile(root, "a", 64)).rejects.toThrow();
      await expect(readVerifierFile(root, "../outside", 64)).rejects.toThrow();
      await writeFile(path.join(f.root, ".env"), "private-marker");
      await expect(readVerifierFile(root, ".env", 64)).rejects.toThrow();
      await expect(readVerifierFile(root, "a", Number.MAX_SAFE_INTEGER)).rejects.toThrow();
      await writeFile(path.join(f.root, "large"), "12345");
      await expect(readVerifierFile(root, "large", 4)).rejects.toThrow();
      expect((await lstat(path.join(outside.root, "outside"))).isFile()).toBe(true);
    } finally {
      await f.dispose();
      await outside.dispose();
    }
  });
});
