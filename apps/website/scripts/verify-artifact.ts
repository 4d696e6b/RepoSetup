import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handoff } from "../src/handoff.ts";

/** Check identity and installed executable bytes before running any packed CLI tests. */
export function verifyArtifact(local: string, expectedSha256 = handoff.artifactSha256) {
  const evidence = JSON.parse(readFileSync(join(local, "evidence.json"), "utf8"));
  if (evidence.commit !== handoff.commit || evidence.version !== handoff.version)
    throw new Error("Packed CLI identity differs from the website's committed target. Repack it.");
  const tarball = join(local, `rsetup-${handoff.version}.tgz`);
  const hash = createHash("sha256").update(readFileSync(tarball)).digest("hex");
  if (evidence.tarballSha256 !== hash || hash !== expectedSha256)
    throw new Error("Packed CLI tarball hash differs from its evidence. Repack it.");
  const entries = parseTarEntries(execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" }));
  const files = entries.filter(
    ({ normalized }) => normalized === "package/package.json" || normalized.endsWith(".js"),
  );
  if (!files.some(({ normalized }) => normalized === "package/dist/bin.js"))
    throw new Error("Packed CLI entry point is missing.");
  for (const { raw, normalized } of files) {
    if (!/^package\/(?:package\.json|dist\/[a-zA-Z0-9_.-]+\.js)$/.test(normalized))
      throw new Error("Unexpected executable path in the packed CLI.");
    const packed = execFileSync("tar", ["-xOzf", tarball, raw]);
    const installed = readFileSync(
      join(local, "installed/node_modules/rsetup", normalized.slice(8)),
    );
    if (!packed.equals(installed))
      throw new Error(`Installed CLI differs from its packed artifact: ${normalized}`);
  }
  const metadata = JSON.parse(
    readFileSync(join(local, "installed/node_modules/rsetup/package.json"), "utf8"),
  );
  if (metadata.name !== "rsetup" || metadata.version !== handoff.version)
    throw new Error("Installed CLI package identity is invalid.");
  return { commit: handoff.commit, version: handoff.version, tarballSha256: hash };
}

export function normalizeTarEntry(entry: string): string {
  return entry.replaceAll("\\", "/").replace(/^(?:\.\/)+/, "");
}

export function parseTarEntries(listing: string): Array<{ raw: string; normalized: string }> {
  return listing
    .trim()
    .split("\n")
    .map((line) => {
      const raw = line.replace(/\r$/, "");
      return { raw, normalized: normalizeTarEntry(raw) };
    });
}
