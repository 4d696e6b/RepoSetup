import { describe, expect, it } from "vitest";

import { packageName, createBuiltInRegistry } from "./index.js";

describe("@reposetup/integrations", () => {
  it("exposes a stable package identity", () => {
    expect(packageName).toBe("@reposetup/integrations");
  });

  it("exports a built-in registry factory", () => {
    expect(
      createBuiltInRegistry()
        .list()
        .map((definition) => definition.id),
    ).toContain("nextjs");
  });
});
