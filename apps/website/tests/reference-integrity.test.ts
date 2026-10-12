import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { release } from "../src/reference/release.js";
import { docPages } from "../src/reference/docs/model.js";
import { catalog } from "../src/beginner/catalog.js";
import published from "../src/reference/generated/published-0.2.3.json";
import { handoff } from "../src/handoff.js";
import provenance from "./fixtures/reference-provenance.json";

const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

it("retains the published full reference beside the separately versioned beginner catalog", () => {
  expect(digest(Buffer.from(JSON.stringify(published)))).toBe(provenance.releaseJsonSha256);
  expect(published.package.version).toBe("0.2.3");
  expect(release.package.version).toBe(handoff.version);
  expect(release.source.revision).toBe(handoff.commit);
  expect(release.source.status).toBe("prepared");
  expect(release.integrations).toHaveLength(37);
  expect(release.presets).toHaveLength(5);
  expect(docPages).toHaveLength(76);
  expect(catalog.integrations).toHaveLength(9);
  expect(catalog.presets).toHaveLength(3);
  for (const preset of release.presets) {
    expect(preset.config.schemaVersion).toBe(1);
    expect(catalog.presets.some((item) => item.id === preset.id)).toBe(false);
  }
});

it("preserves the published brand artwork bytes", () => {
  for (const [name, expected] of Object.entries(provenance.artworkSha256)) {
    expect(digest(readFileSync(new URL(`../public/brand/${name}`, import.meta.url)))).toBe(
      expected,
    );
  }
});
