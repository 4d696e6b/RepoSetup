import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  TASK_BENCHMARK_FIXTURE_IDS,
  TASK_BENCHMARK_PROTOCOL_REVISION,
} from "../../packages/core/dist/index.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import { fixtureRoot, workspaceRoot } from "../tasks/fixture-tools.js";
it("developer report command retains incomplete trials and rejects duplicate/executable metadata safely", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reposetup-i-report-"));
  try {
    const hash = `sha256:${"a".repeat(64)}`;
    const campaign = {
      kind: "task_benchmark_campaign",
      schemaVersion: 1,
      protocolRevision: TASK_BENCHMARK_PROTOCOL_REVISION,
      provenance: "offline",
      sourceRevision: hash,
      runnerRevision: hash,
      host: { platform: "darwin", architecture: "arm64", nodeVersion: "v24.21.0" },
      supportRevision: hash,
      modelCatalogRevision: hash,
      pricingRevision: hash,
      routingPolicyRevision: hash,
      productionQualificationEvidence: null,
      strongConfiguration: {
        adapterId: "openai-responses-v1",
        providerId: "openai-responses-v1",
        modelProfileId: "qualified-strong",
        nativeEffortId: "low",
      },
      fixtures: await Promise.all(
        TASK_BENCHMARK_FIXTURE_IDS.map(async (id) =>
          JSON.parse(await readFile(path.join(fixtureRoot, id, "manifest.json"), "utf8")),
        ),
      ),
      trials: [],
    };
    const file = path.join(root, "campaign.json");
    const run = async () =>
      createDefaultProcessRunner()({
        command: process.execPath,
        args: [path.join(workspaceRoot, "scripts/summarize-task-benchmark.ts"), file],
        cwd: root,
        env: { PATH: "", LANG: "C" },
        timeoutMs: 10000,
      });
    await writeFile(file, JSON.stringify(campaign));
    const incomplete = await run();
    expect(incomplete.exitCode).toBe(3);
    const report = JSON.parse(incomplete.stdout);
    expect(report.missing).toHaveLength(75);
    expect(report.comparisonQualified).toBe(false);
    expect(report.treatments.every((t: { qualified: boolean }) => !t.qualified)).toBe(true);
    for (const text of [
      JSON.stringify({ ...campaign, command: "PRIVATE_MARKER do-not-execute" }),
      '{"kind":"PRIVATE_MARKER","kind":"task_benchmark_campaign"}',
    ]) {
      await writeFile(file, text);
      const rejected = await run();
      expect(rejected.exitCode).toBe(2);
      expect(JSON.parse(rejected.stdout).error.code).toBe("TASK_BENCHMARK_INVALID");
      expect(rejected.stdout + rejected.stderr).not.toContain("PRIVATE_MARKER");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("developer journal reporting includes interrupted compilation requests without redispatch or writes", async () => {
  const { realpath, chmod, readdir } = await import("node:fs/promises");
  const { fixture } = await import("../../packages/core/src/tasks/benchmark.test-helper.js");
  const { executeTaskBenchmark } = await import("../../packages/core/dist/index.js");
  const { createTaskBenchmarkStore } =
    await import("../../packages/cli/src/tasks/benchmark-store.js");
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "reposetup-i-journal-report-")));
  try {
    await chmod(root, 0o700);
    const f = fixture();
    const store = await createTaskBenchmarkStore({ stateRoot: root, campaign: f.campaign });
    if (!store.success) throw new Error(store.error.code);
    const result = await executeTaskBenchmark({ campaign: f.campaign, ports: f.ports });
    if (!result.success) throw new Error(result.error.code);
    for (const event of result.data.retainedEvents.slice(0, 6)) {
      const saved = await store.data.retain(event);
      if (!saved.success) throw new Error(saved.error.code);
    }
    const campaignPath = path.join(root, "campaign.json");
    await writeFile(campaignPath, JSON.stringify(f.campaign));
    const names = await readdir(store.data.folderPath);
    const retainedBytes = await Promise.all(
      names.map((name) => readFile(path.join(store.data.folderPath, name))),
    );
    const observed = await createDefaultProcessRunner()({
      command: process.execPath,
      args: [
        path.join(workspaceRoot, "scripts/summarize-task-benchmark.ts"),
        "--journal",
        campaignPath,
        root,
      ],
      cwd: root,
      env: { PATH: "", LANG: "C" },
      timeoutMs: 10000,
    });
    expect(observed.exitCode).toBe(3);
    const report = JSON.parse(observed.stdout);
    expect(report.terminalReport.cashLedger.providerCalls).toBe(1);
    expect(report.inclusiveKnownCashLedger.providerCalls).toBe(2);
    expect(report.dispatchAccountingComplete).toBe(false);
    expect(report.qualification).toBe(false);
    expect(await readdir(store.data.folderPath)).toEqual(names);
    expect(
      await Promise.all(names.map((name) => readFile(path.join(store.data.folderPath, name)))),
    ).toEqual(retainedBytes);
    expect(f.ports.prepareBlock).toHaveBeenCalledTimes(25); // Only the original simulated construction.
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
