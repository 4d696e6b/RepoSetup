import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { capturePreview } from "./preview.js";

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe("preview snapshot adapter", () => {
  it("does not write or expose sensitive file contents and changes fingerprint when a file changes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-preview-"));
    dirs.push(root);
    await writeFile(path.join(root, "config.json"), '{"password":"first"}\r\n');
    const operation = {
      type: "modify_json" as const,
      path: "config.json",
      merge: { enabled: true },
      behavior: "merge" as const,
      description: "update",
    };
    const first = await capturePreview(root, [operation]);
    expect(first.preview.changes[0]?.category).toBe("modify");
    expect(JSON.stringify(first.preview)).not.toContain("password");
    expect(await readFile(path.join(root, "config.json"), "utf8")).toContain("first");
    await writeFile(path.join(root, "config.json"), '{"password":"second"}\r\n');
    const second = await capturePreview(root, [operation]);
    expect(second.fingerprint).not.toBe(first.fingerprint);
  });

  it("blocks symlinked paths and does not inspect the target", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-preview-"));
    dirs.push(root);
    await mkdir(path.join(root, "outside"));
    await writeFile(path.join(root, "outside", "secret.txt"), "sensitive");
    await symlink(path.join(root, "outside"), path.join(root, "linked"));
    const result = await capturePreview(root, [
      {
        type: "create_file",
        path: "linked/secret.txt",
        content: "new",
        behavior: "overwrite",
        description: "write",
      },
    ]);
    expect(result.preview.blocked).toBe(true);
    expect(JSON.stringify(result.preview)).not.toContain("sensitive");
  });
});
