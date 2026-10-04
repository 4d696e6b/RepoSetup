import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { handoff } from "../src/handoff.js";
import { verifyArtifact } from "../scripts/verify-artifact.ts";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "site-artifact-check-"));
  roots.push(root);
  const installed = join(root, "installed/node_modules/rsetup");
  for (const folder of [join(root, "package/dist"), join(installed, "dist")])
    mkdirSync(folder, { recursive: true });
  const metadata = JSON.stringify({ name: "rsetup", version: handoff.version });
  for (const base of [join(root, "package"), installed]) {
    writeFileSync(join(base, "package.json"), metadata);
    writeFileSync(join(base, "dist/bin.js"), "// fixture, never executed\n");
    writeFileSync(join(base, "dist/chunk.js"), "// bundled implementation\n");
  }
  const tarball = join(root, `rsetup-${handoff.version}.tgz`);
  execFileSync("tar", ["-czf", tarball, "-C", root, "package"]);
  const evidence = {
    commit: handoff.commit,
    version: handoff.version,
    tarballSha256: createHash("sha256").update(readFileSync(tarball)).digest("hex"),
  };
  writeFileSync(join(root, "evidence.json"), JSON.stringify(evidence));
  return { root, installed, evidence, tarball };
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

it("verifies recorded identity, tarball hash and every installed executable chunk", () => {
  const { root, evidence } = fixture();
  expect(verifyArtifact(root)).toEqual(evidence);
});

it.each(["bin.js", "chunk.js"])("refuses an installed %s that differs from the tarball", (file) => {
  const { root, installed } = fixture();
  writeFileSync(join(installed, "dist", file), "// stale or changed bytes\n");
  expect(() => verifyArtifact(root)).toThrow("differs from its packed artifact");
});

it("refuses stale identity, substituted tarballs and missing installed files", () => {
  const { root, evidence, tarball } = fixture();
  writeFileSync(join(root, "evidence.json"), JSON.stringify({ ...evidence, commit: "stale" }));
  expect(() => verifyArtifact(root)).toThrow("committed target");
  writeFileSync(join(root, "evidence.json"), JSON.stringify(evidence));
  writeFileSync(tarball, "not the recorded artifact");
  expect(() => verifyArtifact(root)).toThrow("hash differs");
  const missing = fixture();
  rmSync(join(missing.installed, "dist/chunk.js"));
  expect(() => verifyArtifact(missing.root)).toThrow();
});
