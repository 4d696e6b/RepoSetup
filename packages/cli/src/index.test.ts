import { describe, expect, it } from "vitest";

import { packageName, runCli } from "./index.js";

describe("@reposetup/cli", () => {
  it("exposes a stable package identity", () => {
    expect(packageName).toBe("@reposetup/cli");
  });

  it("exports an injectable CLI runner", () => {
    expect(typeof runCli).toBe("function");
  });
});
