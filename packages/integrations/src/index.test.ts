import { describe, expect, it } from "vitest";

import { packageName } from "./index.js";

describe("@reposetup/integrations", () => {
  it("exposes a stable package identity", () => {
    expect(packageName).toBe("@reposetup/integrations");
  });
});
