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
