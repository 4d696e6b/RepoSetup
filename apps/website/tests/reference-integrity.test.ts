import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { release } from "../src/reference/release.js";
import { docPages } from "../src/reference/docs/model.js";
import { catalog } from "../src/beginner/catalog.js";
import publishedPatch from "../src/reference/generated/published-0.3.1.json";
import published from "../src/reference/generated/published-0.2.3.json";
import { handoff } from "../src/handoff.js";
import provenance from "./fixtures/reference-provenance.json";

const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

it("retains the published full reference beside the separately versioned beginner catalog", () => {
  expect(digest(Buffer.from(JSON.stringify(published)))).toBe(provenance.releaseJsonSha256);
  expect(published.package.version).toBe("0.2.3");
  expect(publishedPatch.package.version).toBe("0.3.1");
  expect(publishedPatch.cli.commands).toHaveLength(11);
  expect(
    digest(
      readFileSync(new URL("../src/reference/generated/published-0.3.1.json", import.meta.url)),
    ),
  ).toBe("035ae9bd174d36c40f1c95600165921c435a01c2f6642e02939ada25c2ea1b89");
  expect(release.package.version).toBe(handoff.version);
  expect(release.source.revision).toBe(handoff.commit);
  expect(release.source.status).toBe("prepared");
  expect(release.integrations).toHaveLength(37);
  expect(release.presets).toHaveLength(5);
  expect(docPages).toHaveLength(84);
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
