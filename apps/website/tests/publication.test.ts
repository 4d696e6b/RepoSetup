import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publicationForBuild, verifyPublication } from "../scripts/verify-publication.ts";
import { handoff } from "../src/handoff.ts";
import { publicationPresentation } from "../src/publication.ts";

const bytes = Buffer.from("reviewed synthetic package bytes; no executable fixture");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const sourceSha = "5".repeat(40);
const target = { version: "0.3.0", artifactSha256: sha256, commit: sourceSha };
const publishedAt = "2026-10-12T08:00:00.000Z";
const now = Date.parse("2026-10-13T08:00:00.000Z");
const tarball = "https://registry.npmjs.org/rsetup/-/rsetup-0.3.0.tgz";
function metadata() {
  return {
    name: "rsetup",
    "dist-tags": { latest: "0.3.0" },
    time: { "0.3.0": publishedAt },
    versions: {
      "0.3.0": {
        name: "rsetup",
        version: "0.3.0",
        dist: {
          tarball,
          integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
        },
      },
    },
  };
}
function request(record = metadata(), packageBytes = bytes) {
  return vi.fn<typeof fetch>(
    async (url) => new Response(url === tarball ? packageBytes : JSON.stringify(record)),
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("website publication guard", () => {
  it("keeps default and explicit candidate builds offline and rejects unknown modes", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await publicationForBuild(undefined)).toBeNull();
    expect(await publicationForBuild("candidate")).toBeNull();
    await expect(publicationForBuild("force")).rejects.toThrow("Unknown");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts actual matching registry bytes and records the registry publication time", async () => {
    const fetch = request();
    expect(await verifyPublication(fetch, now, target)).toEqual({
      version: target.version,
      sha256,
      sourceSha,
      publishedAt,
    });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://registry.npmjs.org/rsetup",
      tarball,
    ]);
    for (const [, options] of fetch.mock.calls) expect(options?.redirect).toBe("error");
  });
  it.each([
    "unpublished",
    "wrong-latest",
    "wrong-package",
    "wrong-version",
    "wrong-registry-name",
    "foreign-url",
    "bad-integrity",
    "future-date",
    "invalid-date",
  ])("refuses %s metadata before downloading a package", async (failure) => {
    const record = metadata();
    const entry = record.versions["0.3.0"];
    if (failure === "unpublished") record.versions = {} as typeof record.versions;
    if (failure === "wrong-latest") record["dist-tags"].latest = "0.2.3";
    if (failure === "wrong-package") entry.name = "different-package";
    if (failure === "wrong-version") entry.version = "0.2.3";
    if (failure === "wrong-registry-name") record.name = "different-package";
    if (failure === "foreign-url") entry.dist.tarball = "https://example.com/package.tgz";
    if (failure === "bad-integrity") entry.dist.integrity = "sha512-invalid";
    if (failure === "future-date") record.time["0.3.0"] = "2099-01-01T00:00:00.000Z";
    if (failure === "invalid-date") record.time["0.3.0"] = "not-a-date";
    const fetch = request(record);
    await expect(verifyPublication(fetch, now, target)).rejects.toThrow("not the verified");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("refuses bytes different from the committed handoff even if registry integrity matches", async () => {
    await expect(
      verifyPublication(request(), now, { ...target, artifactSha256: "0".repeat(64) }),
    ).rejects.toThrow("bytes differ");
  });
  it("refuses registry integrity different from the downloaded bytes", async () => {
    const record = metadata();
    record.versions["0.3.0"].dist.integrity = `sha512-${Buffer.alloc(64).toString("base64")}`;
    await expect(verifyPublication(request(record), now, target)).rejects.toThrow("bytes differ");
  });
  it.each(["metadata", "package"])("bounds %s response size", async (response) => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async (url) =>
        new Response(
          url === tarball
            ? response === "package"
              ? Buffer.alloc(16 * 1024 * 1024 + 1)
              : bytes
            : response === "metadata"
              ? " ".repeat(1024 * 1024 + 1)
              : JSON.stringify(metadata()),
        ),
    );
    await expect(verifyPublication(fetch, now, target)).rejects.toThrow("size limit");
  });
  it("fails closed on unavailable registry and malformed JSON", async () => {
    await expect(
      verifyPublication(async () => new Response(null, { status: 503 }), now, target),
    ).rejects.toThrow("lookup failed");
    await expect(
      verifyPublication(async () => new Response("not-json"), now, target),
    ).rejects.toThrow();
  });
});

it("keeps candidate instructions distinct from verified public installation", () => {
  const candidate = publicationPresentation(null);
  expect(candidate.publishedVersion).toBe("0.3.0");
  expect(candidate.notice).toContain("currently published package remains 0.3.0");
  expect(candidate.builder).toContain("exact commit");
  const published = publicationPresentation({
    version: handoff.version,
    sourceSha,
    sha256,
    publishedAt,
  });
  expect(published.install).toBe(`npm install -g rsetup@${handoff.version}`);
  expect(published.packageUrl).toBe(`https://www.npmjs.com/package/rsetup/v/${handoff.version}`);
  for (const value of Object.values(published).filter((value) => typeof value === "string")) {
    expect(value).not.toMatch(/candidate|unpublished|publication pending|0\.2\.3|packed CLI/);
  }
  expect(published.builder).toContain("asks for confirmation");
});

it("adds the current patch only after verification, preserving 0.3.0 history", async () => {
  vi.stubGlobal("__REPOSETUP_PUBLICATION__", {
    version: handoff.version,
    sourceSha,
    sha256,
    publishedAt,
  });
  const { releaseHistory, publishedHistory } = await import("../src/reference/release-history.ts");
  expect(releaseHistory[0]?.version).toBe(handoff.version);
  expect(releaseHistory[0]?.publishedAt).toBe(publishedAt);
  expect(releaseHistory.slice(1)).toEqual(publishedHistory);
  expect(publishedHistory[0]?.version).toBe("0.3.0");
  expect(releaseHistory[0]?.title).toBe("Consistent JSON removal output");
});
