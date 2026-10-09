import {
  chmod,
  link,
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
import {
  executeTaskBenchmark,
  summarizeTaskBenchmarkJournal,
} from "../../packages/core/dist/index.js";
import { fixture } from "../../packages/core/src/tasks/benchmark.test-helper.js";
import { createTaskBenchmarkStore } from "../../packages/cli/src/tasks/benchmark-store.js";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await chmod(root, 0o700);
    await rm(root, { recursive: true, force: true });
  }
});
async function setup() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-journal-")));
  roots.push(root);
  await chmod(root, 0o700);
  const f = fixture();
  const store = await createTaskBenchmarkStore({ stateRoot: root, campaign: f.campaign });
  if (!store.success) throw new Error(store.error.code);
  return { ...f, root, store: store.data };
}
async function prefix(f: Awaited<ReturnType<typeof setup>>, count = 6) {
  const result = await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports });
  if (!result.success) throw new Error(result.error.code);
  for (const event of result.data.retainedEvents.slice(0, count)) {
    const saved = await f.store.retain(event);
    if (!saved.success) throw new Error(saved.error.code);
  }
  return result.data.retainedEvents;
}
describe("private offline campaign retention through the executor port", () => {
  it("creates nothing at factory/inspection, retains all 250 records and prevents duplicate dispatch", async () => {
    const f = await setup();
    expect(await readdir(f.root)).toEqual([]);
    expect(await f.store.inspect()).toMatchObject({ success: true, data: { events: [] } });
    expect(await readdir(f.root)).toEqual([]);
    const result = await executeTaskBenchmark({
      campaign: f.campaign,
      ports: { ...f.ports, retain: f.store.retain },
    });
    if (!result.success) throw new Error(result.error.code);
    expect(result.data.complete).toBe(true);
    const audited = await f.store.inspect();
    if (!audited.success) throw new Error(audited.error.code);
    expect(audited.data.events).toEqual(result.data.retainedEvents);
    expect(audited.data.campaign.trials).toHaveLength(75);
    expect(await readdir(f.store.folderPath)).toHaveLength(250);
    const bytes = await readFile(path.join(f.store.folderPath, "000.json"));
    const duplicate = await createTaskBenchmarkStore({ stateRoot: f.root, campaign: f.campaign });
    if (!duplicate.success) throw new Error(duplicate.error.code);
    const stopped = await executeTaskBenchmark({
      campaign: f.campaign,
      ports: { ...f.ports, retain: duplicate.data.retain },
    });
    expect(stopped).toMatchObject({
      success: true,
      data: { complete: false, stopCode: "TASK_STATE_WRITE_FAILED", retainedEvents: [] },
    });
    expect(f.ports.prepareBlock).toHaveBeenCalledTimes(25);
    expect(await readFile(path.join(f.store.folderPath, "000.json"))).toEqual(bytes);
  });
  it("reads an interrupted compilation without fabricating a trial or repeating any work", async () => {
    const f = await setup();
    const events = await prefix(f);
    const audited = await f.store.inspect();
    if (!audited.success) throw new Error(audited.error.code);
    const report = summarizeTaskBenchmarkJournal({
      campaign: f.campaign,
      events: audited.data.events,
    });
    if (!report.success) throw new Error(report.error.code);
    expect(report.data.terminalReport.cashLedger.providerCalls).toBe(1);
    expect(report.data.inclusiveKnownCashLedger.providerCalls).toBe(2);
    expect(report.data.unassignedCompilations).toHaveLength(1);
    expect(report.data.qualification).toBe(false);
    expect(await f.store.retain(events[6]!)).toMatchObject({ success: true });
    const pending = await f.store.inspect();
    expect(pending).toMatchObject({ success: true, data: { pending: { type: "trial_started" } } });
  });
  it.each([
    "content",
    "truncation",
    "permissions",
    "symlink",
    "hardlink",
    "inventory",
    "root-permissions",
  ])("rejects %s changes and writes no further record", async (kind) => {
    const f = await setup();
    const events = await prefix(f, 1);
    const first = path.join(f.store.folderPath, "000.json");
    if (kind === "content") await writeFile(first, "{}");
    if (kind === "truncation") await writeFile(first, "{");
    if (kind === "permissions") await chmod(first, 0o644);
    if (kind === "symlink") {
      const bytes = await readFile(first);
      await rm(first);
      const other = path.join(f.root, "other.json");
      await writeFile(other, bytes, { mode: 0o600 });
      await symlink(other, first);
    }
    if (kind === "hardlink") await link(first, path.join(f.root, "other.json"));
    if (kind === "inventory")
      await writeFile(path.join(f.store.folderPath, "foreign.json"), "{}", { mode: 0o600 });
    if (kind === "root-permissions") await chmod(f.root, 0o755);
    expect(await f.store.inspect()).toMatchObject({
      success: false,
      error: { code: "TASK_BENCHMARK_INVALID" },
    });
    expect(await f.store.retain(events[1]!)).toMatchObject({ success: false });
    expect(await readdir(f.store.folderPath)).not.toContain("001.json");
  });
  it("rejects a nonprivate root before allocating a journal", async () => {
    const f = await setup();
    await chmod(f.root, 0o755);
    expect(
      await createTaskBenchmarkStore({ stateRoot: f.root, campaign: f.campaign }),
    ).toMatchObject({ success: false, error: { code: "TASK_SCOPE_VIOLATION" } });
    expect(await readdir(f.root)).toEqual([]);
  });
});
