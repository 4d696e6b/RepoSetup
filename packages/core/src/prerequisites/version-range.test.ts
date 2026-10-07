import { describe, expect, it } from "vitest";

import { isSupportedVersionRange, versionSatisfiesRange } from "./version-range.js";

describe("versionSatisfiesRange", () => {
  it("matches caret and greater-than alternatives", () => {
    const vite = "^20.19.0 || >=22.12.0";
    expect(versionSatisfiesRange([20, 19, 0], vite)).toBe(true);
    expect(versionSatisfiesRange([20, 9, 0], vite)).toBe(false);
    expect(versionSatisfiesRange([22, 11, 0], vite)).toBe(false);
    expect(versionSatisfiesRange([22, 12, 0], vite)).toBe(true);
    expect(versionSatisfiesRange([24, 8, 0], vite)).toBe(true);
  });

  it("rejects a range the checker does not understand", () => {
    expect(isSupportedVersionRange("latest")).toBe(false);
    expect(versionSatisfiesRange([22, 12, 0], "latest")).toBe(false);
  });
});
