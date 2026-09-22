import { describe, expect, it } from "vitest";

import { MAX_CAPTURED_OUTPUT_BYTES, createDefaultProcessRunner } from "./execution-adapters.js";

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
