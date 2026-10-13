import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { expect, it } from "vitest";

it("excludes private brand provenance from a custom output folder while preserving public artwork", async () => {
  const output = await mkdtemp(join(tmpdir(), "reposetup-website-output-"));
  try {
    await build({
      root: fileURLToPath(new URL("../", import.meta.url)),
      build: { outDir: output, emptyOutDir: false },
      logLevel: "silent",
    });
    expect(existsSync(join(output, "index.html"))).toBe(true);
    expect(existsSync(join(output, "brand", "reposetup-mark.svg"))).toBe(true);
    expect(existsSync(join(output, "brand", "hero-stack.png"))).toBe(true);
    expect(existsSync(join(output, "brand", "README.md"))).toBe(false);
    expect(existsSync(join(output, "brand", "prompts.json"))).toBe(false);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
