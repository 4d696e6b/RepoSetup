import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_CAPTURED_OUTPUT_BYTES,
  createDefaultExecutorFileSystem,
  createDefaultProcessRunner,
} from "./execution-adapters.js";

describe("createDefaultExecutorFileSystem", () => {
  it("atomically replaces a final-component symlink without modifying its target", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-atomic-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "reposetup-atomic-outside-"));
    const target = path.join(outside, "target.txt");
    const destination = path.join(root, "destination.txt");

    try {
      await writeFile(target, "outside\n", "utf8");
      await symlink(target, destination);

      await createDefaultExecutorFileSystem().writeFileAtomic(destination, "inside\n");

      expect(await readFile(destination, "utf8")).toBe("inside\n");
      expect(await readFile(target, "utf8")).toBe("outside\n");
    } finally {
      await Promise.all([
        rm(root, { recursive: true, force: true }),
        rm(outside, { recursive: true, force: true }),
      ]);
    }
  });
});

describe("createDefaultProcessRunner", () => {
  it("terminates a timed-out process and reports the timeout", async () => {
    const runner = createDefaultProcessRunner();
    const result = await runner({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10_000)"],
      cwd: process.cwd(),
      timeoutMs: 20,
    });

    expect(result.timedOut).toBe(true);
  });

  it("terminates an aborted process and reports cancellation", async () => {
    const runner = createDefaultProcessRunner();
    const controller = new AbortController();
    const pending = runner({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10_000)"],
      cwd: process.cwd(),
      signal: controller.signal,
    });
    controller.abort();

    const result = await pending;
    expect(result.aborted).toBe(true);
  });

  it("bounds captured output while retaining the latest bytes", async () => {
    const runner = createDefaultProcessRunner();
    const result = await runner({
      command: process.execPath,
      args: ["-e", `process.stdout.write('x'.repeat(${MAX_CAPTURED_OUTPUT_BYTES + 1}))`],
      cwd: process.cwd(),
    });

    expect(result.outputTruncated).toBe(true);
    expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(MAX_CAPTURED_OUTPUT_BYTES);
    expect(result.stdout).toMatch(/x+$/);
  });
});
