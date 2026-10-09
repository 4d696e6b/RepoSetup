import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { repoRoot } from "./harness.js";

describe("release publishing workflow", () => {
  it("requires exact-source platform, recipe, and packed-artifact gates before publication", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github", "workflows", "publish-npm.yml"),
      "utf8",
    );
    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("default: false");
    expect(workflow).toContain("check-release-qualification.mjs");
    expect(workflow).toContain("artifact-ids: ${{ steps.qualification.outputs.artifact_id }}");
    expect(workflow).toContain("run-id: ${{ steps.qualification.outputs.run_id }}");
    expect(workflow.match(/merge-multiple: true/g)).toHaveLength(2);
    expect(workflow).toContain("verify-packed-artifact.mjs --directory candidate");
    expect(workflow).toContain("EXPECTED_SOURCE_SHA: ${{ github.sha }}");
    expect(workflow).toContain(
      "EXPECTED_PACKAGE_VERSION: ${{ steps.qualification.outputs.package_version }}",
    );
    expect(workflow).toContain("group: publish-rsetup\n");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).not.toContain("0.2.3");
    expect(workflow).not.toMatch(/ref: v\d/);
    expect(workflow).toContain("publish-qualified-artifact.mjs");
    expect(workflow).toContain("verify-registry-release.mjs");
    expect(workflow).not.toContain("pnpm build");
    expect(workflow).not.toContain("pnpm --filter rsetup pack");
    expect(workflow).not.toContain("push:");
    expect(workflow).not.toContain("continue-on-error");
  });

  it("binds live-service evidence to the checked-out candidate version", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github", "workflows", "live-services.yml"),
      "utf8",
    );
    expect(workflow).toContain("readReleaseContext");
    expect(workflow).toContain("assert.equal(record.packageVersion, release.version)");
    expect(workflow).toContain("assert.equal(record.sourceCommit, process.env.GITHUB_SHA)");
    expect(workflow).toContain("assert.equal(record.cleanup, true)");
    expect(workflow).not.toContain("0.2.3");
  });

  it("can qualify a candidate artifact without a release tag or publication", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github", "workflows", "release.yml"),
      "utf8",
    );
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("faults:");
    expect(workflow).toContain("pack-candidate:");
    expect(workflow).toContain("needs: [platform, golden, faults, task-offline, task-verifier]");
    expect(workflow).toContain("artifact-acceptance:");
    expect(workflow).toContain('REPOSETUP_USABILITY_OCCUPY_DEV_PORT: "1"');
    expect(workflow).toContain("verify-packed-artifact.mjs --directory candidate");
    expect(workflow).not.toContain("npm publish");
  });

  it("requires every task release cell and retains the inherited artifact mismatch gate", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github", "workflows", "release.yml"),
      "utf8",
    );
    const offline = workflow.split("  task-offline:\n")[1]?.split("  task-verifier:\n")[0];
    const verifier = workflow.split("  task-verifier:\n")[1]?.split("  pack-candidate:\n")[0];
    for (const job of [offline, verifier]) {
      expect(job).toContain("os: [ubuntu-24.04, macos-15]");
      expect(job).toContain("node-version: 24");
      expect(job).toContain("pnpm install --frozen-lockfile");
      expect(job).not.toContain("secrets.");
      expect(job).not.toContain("continue-on-error");
      expect(job).not.toContain("if:");
    }
    expect(offline).toContain("pnpm typecheck:task-tests");
    expect(offline).toContain("pnpm exec vitest run --config tests/e2e/vitest.tasks.config.ts");
    expect(verifier).toContain("pnpm test:tasks:verifier");
    expect(verifier).toContain("timeout-minutes: 60");
    expect(workflow).toContain("github.ref_name == 'codex/release-0.3.0'");
    expect(workflow).toContain("github.ref_name == 'codex/release-0.4.0'");
    const defaultConfig = await readFile(
      path.join(repoRoot, "tests", "e2e", "vitest.config.ts"),
      "utf8",
    );
    expect(defaultConfig).toContain('"tests/e2e/task-*.test.ts"');
  });
});

describe("0.3.0 release staging artifact protection", () => {
  it.each(["release.yml", "selection-create.yml", "selection-contract.yml"])(
    "keeps the website artifact pin active on canonical release branches in %s",
    async (file) => {
      const workflow = await readFile(path.join(repoRoot, ".github", "workflows", file), "utf8");
      const guard = workflow.match(
        /if: ([^\n]+)\n\s+run: node scripts\/check-candidate-artifact\.mjs/,
      );
      expect(guard).not.toBeNull();
      expect(guard![1]).toBe(
        "github.ref_name == 'codex/0.3.0-candidate-integration' || github.ref_name == 'codex/release-0.3.0' || github.ref_name == 'codex/release-0.4.0'",
      );
    },
  );

  it.each(["selection-create.yml", "selection-contract.yml", "website-qualification.yml"])(
    "includes canonical release branches in the %s push qualification",
    async (file) => {
      const workflow = await readFile(path.join(repoRoot, ".github", "workflows", file), "utf8");
      const push = workflow.split("  push:\n")[1]?.split("  workflow_dispatch:")[0];
      expect(push).toBeDefined();
      expect(push).toContain("codex/release-0.3.0");
      expect(push).toContain("codex/release-0.4.0");
    },
  );
});
