import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  RELEASE_HISTORY_PUBLICATION_SOURCE,
  RELEASE_HISTORY_VERIFIED_ON,
  releaseDateLabel,
  publishedHistory as releaseHistory,
} from "../src/reference/release-history";
import { release, REPOSITORY } from "../src/reference/release";
import { handoff } from "../src/handoff";

const changelog = readFileSync(new URL("../../../CHANGELOG.md", import.meta.url), "utf8");
const recordedVersions = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map(
  (match) => match[1]!,
);
const text = (version: string) => {
  const entry = releaseHistory.find((item) => item.version === version)!;
  return [
    entry.summary,
    ...entry.changes.flatMap((change) => [change.title, change.description]),
    entry.qualification,
  ].join(" ");
};

describe("published release history", () => {
  it("preserves the complete historical npm series separately from the delivered 0.3.0 changelog", () => {
    expect(recordedVersions).toEqual([
      handoff.version,
      ...releaseHistory.map(({ version }) => version),
    ]);
    expect(releaseHistory).toHaveLength(7);
    expect(releaseHistory[0]!.version).toBe("0.3.0");

    expect(releaseHistory.map(({ version }) => version)).toEqual([
      "0.3.0",
      "0.2.3",
      "0.2.2",
      "0.2.1",
      "0.2.0",
      "0.1.1",
      "0.1.0",
    ]);
    expect(new Set(releaseHistory.map(({ version }) => version)).size).toBe(releaseHistory.length);
    const publicationTimes = releaseHistory.map(({ publishedAt }) => Date.parse(publishedAt));
    expect(publicationTimes.every(Number.isFinite)).toBe(true);
    expect(publicationTimes).toEqual([...publicationTimes].sort((a, b) => b - a));
  });

  it("uses verified npm publication dates and historical runtime requirements", () => {
    expect(RELEASE_HISTORY_PUBLICATION_SOURCE).toBe("https://registry.npmjs.org/rsetup");
    expect(RELEASE_HISTORY_VERIFIED_ON).toBe("2026-10-13");
    // The package shipped after the October 8 preparation/changelog date.
    expect(releaseHistory[0]!.publishedAt).toBe("2026-10-13T07:26:26.268Z");
    expect(releaseHistory[1]!.publishedAt).toBe("2026-10-09T02:48:16.084Z");
    expect(releaseDateLabel(releaseHistory[0]!.publishedAt)).toBe("October 13, 2026");
    expect(releaseDateLabel(releaseHistory[1]!.publishedAt)).toBe("October 9, 2026");
    expect(releaseDateLabel("2026-10-09T23:59:59Z")).toBe("October 9, 2026");
    expect(releaseHistory.slice(0, 5).map(({ nodeRequirement }) => nodeRequirement)).toEqual(
      Array.from({ length: 5 }, () => "Node 24+"),
    );
    expect(releaseHistory.slice(5).map(({ nodeRequirement }) => nodeRequirement)).toEqual(
      Array.from({ length: 2 }, () => "Node 20+ at publication"),
    );
  });

  it("links each historical package and real notes without inventing missing early release pages", () => {
    for (const entry of releaseHistory) {
      expect(entry.title.trim()).not.toBe("");
      expect(entry.summary.trim()).not.toBe("");
      expect(entry.qualification.trim()).not.toBe("");
      expect(entry.changes.length).toBeGreaterThanOrEqual(2);
      expect(
        entry.changes.every(({ title, description }) => title.trim() && description.trim()),
      ).toBe(true);
      expect(entry.sources).toContainEqual({
        label: `npm package ${entry.version}`,
        href: `https://www.npmjs.com/package/rsetup/v/${entry.version}`,
      });
      for (const source of entry.sources) {
        const url = new URL(source.href);
        expect(url.protocol).toBe("https:");
        expect(["github.com", "www.npmjs.com"]).toContain(url.hostname);
        expect(source.label).toContain(entry.version);
      }
      if (!entry.version.startsWith("0.1."))
        expect(entry.sources).toContainEqual({
          label: `Release notes ${entry.version}`,
          href: `${REPOSITORY}/releases/tag/v${entry.version}`,
        });
      else {
        expect(entry.sources.some(({ href }) => href.includes("/releases/tag/"))).toBe(false);
        expect(entry.sources).toContainEqual({
          label: `Changelog ${entry.version}`,
          href: `${REPOSITORY}/blob/v0.1.1/CHANGELOG.md`,
        });
      }
    }
  });

  it("keeps catalog facts and historical qualification limits consistent with the pinned project", () => {
    expect(release.presets).toHaveLength(5);
    expect(text("0.2.0")).toContain("five");
    const introducedExamples = ["testing-library", "tanstack-query", "httpx", "pydantic-settings"];
    for (const id of introducedExamples)
      expect(release.integrations.some((integration) => integration.id === id)).toBe(true);
    expect(text("0.1.0")).toContain("33 built-in integration IDs");
    expect(text("0.1.0")).toContain("No integration was labeled stable");
    expect(text("0.2.1")).toContain("No integration became stable");
    expect(text("0.2.2")).toContain("read-only");
    expect(text("0.2.2")).toContain("database/container connectivity");
    expect(text("0.2.3")).toContain("representative live database cases");
    expect(text("0.2.3")).toContain("Arbitrary combinations");
    expect(text("0.2.3")).toContain("maturity");
    expect(JSON.stringify(releaseHistory)).not.toMatch(
      /0\.3\.1|0\.4\.\d|0\.1\.0-alpha|--selection/,
    );
  });
});
