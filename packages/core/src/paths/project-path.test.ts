import { describe, expect, it } from "vitest";

import { isSafeProjectName, isSafeProjectRelativePath } from "./project-path.js";

describe("project path safety", () => {
  it("accepts a directory-safe project name", () => {
    expect(isSafeProjectName("my-app")).toBe(true);
  });

  it("rejects names that can be used for path traversal", () => {
    expect(isSafeProjectName("")).toBe(false);
    expect(isSafeProjectName("..")).toBe(false);
    expect(isSafeProjectName("foo/bar")).toBe(false);
    expect(isSafeProjectName("foo\\bar")).toBe(false);
  });

  it("accepts a project-relative file path", () => {
    expect(isSafeProjectRelativePath(".")).toBe(true);
    expect(isSafeProjectRelativePath("src/app")).toBe(true);
  });

  it("rejects absolute and traversing paths", () => {
    expect(isSafeProjectRelativePath("/tmp/app")).toBe(false);
    expect(isSafeProjectRelativePath("C:\\Windows")).toBe(false);
    expect(isSafeProjectRelativePath("../etc")).toBe(false);
    expect(isSafeProjectRelativePath("apps/../../secret")).toBe(false);
  });
});
