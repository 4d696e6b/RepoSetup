import { describe, expect, it } from "vitest";

import { packageName, runCli } from "./index.js";

describe("reposetup", () => {
  it("exposes a stable package identity", () => {
    expect(packageName).toBe("reposetup");
  });

  it("exports an injectable CLI runner", () => {
    expect(typeof runCli).toBe("function");
  });
});
