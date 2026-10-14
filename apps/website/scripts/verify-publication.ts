import { createHash } from "node:crypto";
import { z } from "zod";
import { handoff } from "../src/handoff.ts";
import type { Publication } from "../src/publication.ts";

const registry = "https://registry.npmjs.org/rsetup";

async function boundedResponse(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error("Publication lookup failed.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error("Publication response exceeds its size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks, length);
}

/** Build-time verification only. No registry requests or package execution in the browser. */
export async function verifyPublication(
  request: typeof fetch = fetch,
  now: number = Date.now(),
  target: Pick<typeof handoff, "version" | "artifactSha256" | "commit"> = handoff,
): Promise<Publication> {
  const get = (url: string) =>
    request(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
  const version = target.version;
  const tarballUrl = `${registry}/-/rsetup-${version}.tgz`;
  const failure = () =>
    new Error(`rsetup@${version} is not the verified published latest release.`);
  const parsed = z
    .object({
      name: z.literal("rsetup"),
      "dist-tags": z.object({ latest: z.literal(version) }),
      time: z.record(z.string(), z.string()),
      versions: z.record(z.string(), z.unknown()),
    })
    .safeParse(
      JSON.parse(
        Buffer.from(await boundedResponse(await get(registry), 1024 * 1024)).toString("utf8"),
      ),
    );
  if (!parsed.success) throw failure();
  const metadata = parsed.data;
  const selected = z
    .object({
      name: z.literal("rsetup"),
      version: z.literal(version),
      dist: z.object({
        tarball: z.literal(tarballUrl),
        integrity: z.string().regex(/^sha512-[A-Za-z0-9+/]{86}==$/),
      }),
    })
    .safeParse(metadata.versions[version]);
  if (!selected.success) throw failure();
  const entry = selected.data;
  const publishedAt = metadata.time[version];
  if (
    typeof publishedAt !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(publishedAt) ||
    !Number.isFinite(Date.parse(publishedAt)) ||
    new Date(publishedAt).toISOString() !== publishedAt ||
    Date.parse(publishedAt) > now
  ) {
    throw failure();
  }
  const bytes = await boundedResponse(await get(tarballUrl), 16 * 1024 * 1024);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  if (sha256 !== target.artifactSha256 || integrity !== entry.dist.integrity) {
    throw new Error("Published package bytes differ from the reviewed website handoff.");
  }
  return { version, sourceSha: target.commit, sha256, publishedAt };
}

export async function publicationForBuild(mode: string | undefined): Promise<Publication | null> {
  if (mode === undefined || mode === "candidate") return null;
  if (mode !== "published") throw new Error("Unknown website release mode.");
  return verifyPublication();
}
