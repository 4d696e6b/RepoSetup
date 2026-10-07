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
    expect(workflow).not.toContain("ref: v0.2.0");
    expect(workflow).toContain("publish-qualified-artifact.mjs");
    expect(workflow).toContain("verify-registry-release.mjs");
    expect(workflow).not.toContain("pnpm build");
    expect(workflow).not.toContain("pnpm --filter rsetup pack");
    expect(workflow).not.toContain("push:");
    expect(workflow).not.toContain("continue-on-error");
  });

  it("can qualify a candidate artifact without a release tag or publication", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github", "workflows", "release.yml"),
      "utf8",
    );
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("faults:");
    expect(workflow).toContain("pack-candidate:");
    expect(workflow).toContain("needs: [platform, golden, faults]");
    expect(workflow).toContain("artifact-acceptance:");
    expect(workflow).toContain('REPOSETUP_USABILITY_OCCUPY_DEV_PORT: "1"');
    expect(workflow).toContain("verify-packed-artifact.mjs --directory candidate");
    expect(workflow).not.toContain("npm publish");
  });
});
