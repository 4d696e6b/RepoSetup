import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { isSafeTaskPath, isPrivateVerifierPath } from "@reposetup/core";

export type VerifierRoot = { path: string; dev: number; ino: number };
export async function captureVerifierRoot(root: string): Promise<VerifierRoot> {
  if (!["darwin", "linux"].includes(process.platform) || typeof constants.O_NOFOLLOW !== "number")
    throw new Error("profile");
  const canonical = await realpath(root);
  if (canonical !== root) throw new Error("root alias");
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("root type");
  return Object.freeze({ path: root, dev: info.dev, ino: info.ino });
}
export async function verifyVerifierRoot(root: VerifierRoot): Promise<void> {
  const info = await lstat(root.path);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    info.dev !== root.dev ||
    info.ino !== root.ino ||
    (await realpath(root.path)) !== root.path
  )
    throw new Error("root drift");
}
export async function resolveVerifierFile(root: VerifierRoot, relative: string): Promise<string> {
  if (!isSafeTaskPath(relative) || relative.split("/").length > 32) throw new Error("path");
  await verifyVerifierRoot(root);
  let current = root.path;
  const segments = relative.split("/");
  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index]!);
    const info = await lstat(current);
    if (
      info.isSymbolicLink() ||
      (index < segments.length - 1 && !info.isDirectory()) ||
      (await realpath(current)) !== current
    )
      throw new Error("component");
  }
  return current;
}
/** Streamed content hashing; optional retained bytes are separately bounded by the caller. */
export async function readVerifierFile(
  root: VerifierRoot,
  relative: string,
  maxBytes: number,
  retain = false,
): Promise<{ fileHash: string; byteLength: number; bytes: Buffer; fingerprint: string }> {
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 268435456 ||
    (retain && maxBytes > 131072)
  )
    throw new Error("bound");
  if (isPrivateVerifierPath(path.join(root.path, relative))) throw new Error("private path");
  let handle: FileHandle | undefined;
  try {
    const target = await resolveVerifierFile(root, relative);
    const before = await lstat(target);
    if (!before.isFile() || before.nlink !== 1 || before.size > maxBytes) throw new Error("file");
    handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = await handle.stat();
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      before.dev !== opened.dev ||
      before.ino !== opened.ino ||
      before.size !== opened.size
    )
      throw new Error("open drift");
    const hash = createHash("sha256");
    const chunks: Buffer[] = [];
    const buffer = Buffer.alloc(Math.min(maxBytes + 1, 65536));
    let length = 0;
    while (length <= maxBytes) {
      const read = await handle.read(
        buffer,
        0,
        Math.min(buffer.length, maxBytes + 1 - length),
        length,
      );
      if (read.bytesRead === 0) break;
      const chunk = buffer.subarray(0, read.bytesRead);
      length += chunk.byteLength;
      if (length > maxBytes) throw new Error("overflow");
      hash.update(chunk);
      if (retain) chunks.push(Buffer.from(chunk));
    }
    const after = await handle.stat();
    const final = await lstat(await resolveVerifierFile(root, relative));
    if (
      length !== after.size ||
      metadataFingerprint(opened) !== metadataFingerprint(after) ||
      metadataFingerprint(after) !== metadataFingerprint(final)
    )
      throw new Error("read drift");
    await verifyVerifierRoot(root);
    return {
      fileHash: `sha256:${hash.digest("hex")}`,
      byteLength: length,
      bytes: retain ? Buffer.concat(chunks) : Buffer.alloc(0),
      fingerprint: metadataFingerprint(final),
    };
  } finally {
    await handle?.close();
  }
}
export function metadataFingerprint(info: {
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  uid?: number;
  gid?: number;
}): string {
  return `sha256:${createHash("sha256")
    .update(
      JSON.stringify({
        uid: info.uid,
        gid: info.gid,
        dev: info.dev,
        ino: info.ino,
        mode: info.mode,
        nlink: info.nlink,
        size: info.size,
        mtimeMs: info.mtimeMs,
        ctimeMs: info.ctimeMs,
      }),
    )
    .digest("hex")}`;
}
