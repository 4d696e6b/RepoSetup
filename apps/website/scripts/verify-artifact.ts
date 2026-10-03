import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handoff } from "../src/handoff.ts";

/** Check identity and installed executable bytes before running any packed CLI tests. */
export function verifyArtifact(local: string) {
  const evidence = JSON.parse(readFileSync(join(local, "evidence.json"), "utf8"));
  if (evidence.commit !== handoff.commit || evidence.version !== handoff.version)
    throw new Error("Packed CLI identity differs from the website's committed target. Repack it.");
  const tarball = join(local, `rsetup-${handoff.version}.tgz`);
  const hash = createHash("sha256").update(readFileSync(tarball)).digest("hex");
  if (evidence.tarballSha256 !== hash)
    throw new Error("Packed CLI tarball hash differs from its evidence. Repack it.");
  const entries = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" }).trim().split("\n");
  const files = entries.filter(
    (entry) => entry === "package/package.json" || entry.endsWith(".js"),
  );
  if (!files.includes("package/dist/bin.js")) throw new Error("Packed CLI entry point is missing.");
  for (const entry of files) {
    if (!/^package\/(?:package\.json|dist\/[a-zA-Z0-9_.-]+\.js)$/.test(entry))
      throw new Error("Unexpected executable path in the packed CLI.");
    const packed = execFileSync("tar", ["-xOzf", tarball, entry]);
    const installed = readFileSync(join(local, "installed/node_modules/rsetup", entry.slice(8)));
    if (!packed.equals(installed))
      throw new Error(`Installed CLI differs from its packed artifact: ${entry}`);
  }
  const metadata = JSON.parse(
    readFileSync(join(local, "installed/node_modules/rsetup/package.json"), "utf8"),
  );
  if (metadata.name !== "rsetup" || metadata.version !== handoff.version)
    throw new Error("Installed CLI package identity is invalid.");
  return { commit: handoff.commit, version: handoff.version, tarballSha256: hash };
}
