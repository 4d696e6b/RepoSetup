import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveInsideRoot } from "./resolve-path.js";

describe("resolveInsideRoot", () => {
  const root = path.join(os.tmpdir(), "reposetup-root");

  it("resolves a project-relative path inside the root", () => {
    const result = resolveInsideRoot(root, "src/app.ts");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.absolutePath).toBe(path.resolve(root, "src/app.ts"));
  });

  it("allows the project root itself", () => {
    const result = resolveInsideRoot(root, ".");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.absolutePath).toBe(path.resolve(root));
  });

  it("rejects path traversal and absolute paths", () => {
    expect(resolveInsideRoot(root, "../secret").ok).toBe(false);
    expect(resolveInsideRoot(root, "/tmp/outside").ok).toBe(false);
  });
});
