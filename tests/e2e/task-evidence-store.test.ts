import {
  chmod,
  link,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { executeTaskBenchmark } from "../../packages/core/dist/index.js";
import { evidenceFixture } from "../../packages/core/src/tasks/benchmark-final-evidence.test-helper.js";
import { createTaskBenchmarkEvidenceStore } from "../../packages/cli/src/tasks/benchmark-evidence-store.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await chmod(root, 0o700);
    await rm(root, { recursive: true, force: true });
  }
});
async function setup() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-evidence-")));
  roots.push(root);
  await chmod(root, 0o700);
  const f = evidenceFixture();
  const executed = await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports });
  if (!executed.success || !executed.data.complete)
    throw new Error("Synthetic contract setup failed");
  const store = await createTaskBenchmarkEvidenceStore({ stateRoot: root, campaign: f.campaign });
  if (!store.success) throw new Error(store.error.code);
  return { ...f, root, store: store.data };
}
describe("private independent terminal record retention", () => {
  it("creates nothing at inspection, then fsyncs and reads immutable slot-bound records", async () => {
    const f = await setup();
    expect(await f.store.inspect([])).toMatchObject({ success: true, data: { artifacts: [] } });
    expect(await readdir(f.root)).toEqual([]);
    expect(
      await f.store.retain({ events: f.events.slice(0, 3), artifact: f.artifacts[0] }),
    ).toMatchObject({ success: true });
    const pending = await f.store.inspect(f.events.slice(0, 3));
    expect(pending).toMatchObject({
      success: true,
      data: { linkedRecords: 0, unreferenced: [f.artifacts[0]], qualification: false },
    });
    const names = await readdir(f.store.folderPath);
    expect(names).toEqual(["types-result-v1-0-whole.json"]);
    const file = path.join(f.store.folderPath, names[0]!);
    expect((await lstat(file)).mode & 0o777).toBe(0o600);
    expect((await lstat(f.store.folderPath)).mode & 0o777).toBe(0o700);
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual(f.artifacts[0]);
    const reopened = await createTaskBenchmarkEvidenceStore({
      stateRoot: f.root,
      campaign: f.campaign,
    });
    if (!reopened.success) throw new Error(reopened.error.code);
    expect(await reopened.data.inspect(f.events.slice(0, 4))).toMatchObject({
      success: true,
      data: { linkedRecords: 1, missing: [], unreferenced: [], acceptanceAuthenticated: false },
    });
    expect(
      await reopened.data.retain({ events: f.events.slice(0, 7), artifact: f.artifacts[1] }),
    ).toMatchObject({ success: false });
    expect(
      await f.store.retain({ events: f.events.slice(0, 7), artifact: f.artifacts[1] }),
    ).toMatchObject({ success: true });
    expect(await f.store.inspect(f.events.slice(0, 8))).toMatchObject({
      success: true,
      data: { linkedRecords: 2, missing: [] },
    });
  });
  it("rejects duplicate or unmatched terminal records before writing", async () => {
    const f = await setup();
    expect(await f.store.retain({ events: [], artifact: f.artifacts[0] })).toMatchObject({
      success: false,
    });
    expect(await readdir(f.root)).toEqual([]);
    expect(
      await f.store.retain({ events: f.events.slice(0, 3), artifact: f.artifacts[0] }),
    ).toMatchObject({ success: true });
    const before = await readFile(path.join(f.store.folderPath, "types-result-v1-0-whole.json"));
    expect(
      await f.store.retain({ events: f.events.slice(0, 3), artifact: f.artifacts[0] }),
    ).toMatchObject({ success: false });
    expect(await readFile(path.join(f.store.folderPath, "types-result-v1-0-whole.json"))).toEqual(
      before,
    );
  });
  it.each([
    "content",
    "truncated",
    "permissions",
    "symlink",
    "hardlink",
    "inventory",
    "root-permissions",
    "removed",
  ])("fails closed after %s corruption", async (kind) => {
    const f = await setup();
    expect(
      await f.store.retain({ events: f.events.slice(0, 3), artifact: f.artifacts[0] }),
    ).toMatchObject({ success: true });
    const file = path.join(f.store.folderPath, "types-result-v1-0-whole.json");
    if (kind === "content") await writeFile(file, "{}");
    if (kind === "truncated") await writeFile(file, "{");
    if (kind === "permissions") await chmod(file, 0o644);
    if (kind === "symlink") {
      const other = path.join(f.root, "other.json");
      await writeFile(other, await readFile(file), { mode: 0o600 });
      await rm(file);
      await symlink(other, file);
    }
    if (kind === "hardlink") await link(file, path.join(f.root, "other.json"));
    if (kind === "inventory")
      await writeFile(path.join(f.store.folderPath, "foreign.json"), "{}", { mode: 0o600 });
    if (kind === "root-permissions") await chmod(f.root, 0o755);
    if (kind === "removed") await rm(file);
    const audit = await f.store.inspect(f.events.slice(0, 4));
    if (kind === "removed")
      expect(audit).toMatchObject({
        success: true,
        data: { missing: ["types-result-v1/0/whole"] },
      });
    else expect(audit).toMatchObject({ success: false });
    expect(
      await f.store.retain({ events: f.events.slice(0, 7), artifact: f.artifacts[1] }),
    ).toMatchObject({ success: false });
    expect(await readdir(f.store.folderPath)).not.toContain("types-result-v1-0-fixed.json");
  });
});
