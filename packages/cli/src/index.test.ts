import { describe, expect, it } from "vitest";

import { packageName, runCli } from "./index.js";

describe("rsetup", () => {
  it("exposes a stable package identity", () => {
    expect(packageName).toBe("rsetup");
  });

  it("exports an injectable CLI runner", () => {
    expect(typeof runCli).toBe("function");
  });
});
