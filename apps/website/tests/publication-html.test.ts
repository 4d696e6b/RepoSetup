import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { publicationHtml } from "../scripts/publication-html.ts";
import { handoff } from "../src/handoff.ts";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

it("links the actual previous published guide in an offline candidate build", () => {
  const output = publicationHtml(html, null);
  expect(output).toContain(`${handoff.version} candidate`);
  expect(output).toContain("blob/v0.3.1/README.md");
  expect(output).toContain("0.3.1 user guide");
  expect(output).not.toContain("0.2.3 user guide");
});

it("uses the verified current publication for metadata and the no-JavaScript guide", () => {
  const output = publicationHtml(html, {
    version: handoff.version,
    sourceSha: handoff.commit,
    sha256: handoff.artifactSha256,
    publishedAt: "2026-10-13T10:00:00.000Z",
  });
  expect(output).toContain(`Explore RepoSetup ${handoff.version},`);
  expect(output).toContain(`blob/v${handoff.version}/README.md`);
  expect(output).toContain(`${handoff.version} user guide`);
  expect(output).not.toMatch(/candidate|0\.2\.3 user guide|0\.3\.0 development/);
});

it("fails rather than silently retaining outdated metadata when the HTML template changes", () => {
  expect(() => publicationHtml(html.replace("0.2.3 user guide", "Changed guide"), null)).toThrow(
    "Missing release HTML marker",
  );
});
