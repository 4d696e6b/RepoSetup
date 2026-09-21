import { describe, expect, it } from "vitest";

import { configFromAnswers } from "./config-from-answers.js";

describe("configFromAnswers", () => {
  it("builds a schemaVersion 1 config and omits unused optional fields", () => {
    const config = configFromAnswers({
      projectName: "demo",
      runtimeId: "node",
      packageManager: "pnpm",
      frameworkId: "fake-framework",
      integrations: [{ id: "fake-db" }],
    });

    expect(config).toEqual({
      schemaVersion: 1,
      project: { name: "demo" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "fake-framework" },
      integrations: [{ id: "fake-db" }],
    });
    expect("path" in config.project).toBe(false);
    expect("options" in config.framework).toBe(false);
  });
});
