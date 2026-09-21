import { describe, expect, it } from "vitest";

import { packageName } from "./index.js";

describe("@reposetup/registry", () => {
  it("exposes a stable package identity", () => {
    expect(packageName).toBe("@reposetup/registry");
  });
});
