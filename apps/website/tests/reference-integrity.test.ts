import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { release } from "../src/reference/release.js";
import { docPages } from "../src/reference/docs/model.js";
import { catalog } from "../src/beginner/catalog.js";

const publishedWebsiteSource = "5e40fa839c2c80391de145547bf4ff2eea5f09a1";

it("retains the published full reference beside the separately versioned beginner catalog", () => {
  const published = JSON.parse(
    execFileSync(
      "git",
      ["show", `${publishedWebsiteSource}:apps/website/src/generated/release.json`],
      { encoding: "utf8" },
    ),
  );
  expect(release).toEqual(published);
  expect(release.package.version).toBe("0.2.3");
  expect(release.integrations).toHaveLength(37);
  expect(release.presets).toHaveLength(5);
  expect(docPages).toHaveLength(72);
  expect(catalog.integrations).toHaveLength(9);
  expect(catalog.presets).toHaveLength(3);
  for (const preset of release.presets) {
    expect(preset.config.schemaVersion).toBe(1);
    expect(catalog.presets.some((item) => item.id === preset.id)).toBe(false);
  }
});

it("preserves the published brand artwork bytes", () => {
  for (const name of ["reposetup-wordmark.svg", "hero-stack.png", "tablet-hand.png"]) {
    const published = execFileSync(
      "git",
      ["show", `${publishedWebsiteSource}:apps/website/public/brand/${name}`],
      { maxBuffer: 10 * 1024 * 1024 },
    );
    const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
    expect(digest(readFileSync(new URL(`../public/brand/${name}`, import.meta.url)))).toBe(
      digest(published),
    );
  }
});
