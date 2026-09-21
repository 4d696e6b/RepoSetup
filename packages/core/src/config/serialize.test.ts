import { describe, expect, it } from "vitest";

import { parseRepoSetupConfig } from "./parse.js";
import { serializeRepoSetupConfig } from "./serialize.js";
import { SCHEMA_VERSION, type RepoSetupConfig } from "./types.js";

const config: RepoSetupConfig = {
  schemaVersion: SCHEMA_VERSION,
  project: { name: "example-next-app", path: "." },
  runtime: { id: "node" },
  packageManager: "pnpm",
  framework: { id: "nextjs", options: { typescript: true } },
  integrations: [{ id: "sqlite" }, { id: "prisma" }],
};

describe("serializeRepoSetupConfig", () => {
  it("writes schemaVersion 1 JSON without cwd, secrets, or commands", () => {
    const json = serializeRepoSetupConfig(config);

    expect(json).toContain(`"schemaVersion": ${SCHEMA_VERSION}`);
    expect(json).not.toContain("path");
    expect(json).not.toContain("DATABASE_URL");
    expect(json).not.toContain("/tmp");
    expect(json).not.toContain("commands");
    expect(JSON.parse(json)).toEqual({
      schemaVersion: 1,
      project: { name: "example-next-app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "nextjs", options: { typescript: true } },
      integrations: [{ id: "sqlite" }, { id: "prisma" }],
    });
  });

  it("round-trips through parseRepoSetupConfig", () => {
    const parsed = parseRepoSetupConfig(JSON.parse(serializeRepoSetupConfig(config)));
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.config.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.config.project).toEqual({ name: "example-next-app" });
  });
});
