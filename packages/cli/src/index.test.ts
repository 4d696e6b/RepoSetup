import { describe, expect, it } from "vitest";

import { packageName, runCli } from "./index.js";

describe("@pacharapolpimpa/reposetup", () => {
  it("exposes a stable package identity", () => {
    expect(packageName).toBe("@pacharapolpimpa/reposetup");
  });

  it("exports an injectable CLI runner", () => {
    expect(typeof runCli).toBe("function");
  });
});
