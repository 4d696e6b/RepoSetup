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
    expect(workflow).toContain("needs: [platform, golden, faults]");
    expect(workflow).toContain("faults:");
    expect(workflow).toContain("needs: pack-candidate");
    expect(workflow).toContain(
      "needs: [platform, golden, faults, pack-candidate, artifact-acceptance]",
    );
    expect(workflow).toContain('REPOSETUP_USABILITY_OCCUPY_DEV_PORT: "1"');
    expect(workflow).toContain("pnpm test:e2e");
    expect(workflow).toContain("pnpm test:golden");
    expect(workflow).toContain("write-artifact-evidence.mjs");
    expect(workflow).toContain("verify-packed-artifact.mjs --directory candidate");
    expect(workflow).toContain('test "$SOURCE_SHA" = "$GITHUB_SHA"');
    expect(workflow).toContain('npm publish "$TARBALL" --access public');
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
