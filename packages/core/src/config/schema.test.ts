import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseRepoSetupConfig } from "./parse.js";
import type { RepoSetupConfig } from "./types.js";

const exampleConfigPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../examples/reposetup.next-sqlite.json",
);

const exampleConfig = JSON.parse(readFileSync(exampleConfigPath, "utf8")) as unknown;

const validConfig: RepoSetupConfig = {
  schemaVersion: 1,
  project: {
    name: "example-next-app",
  },
  runtime: {
    id: "node",
  },
  packageManager: "pnpm",
  framework: {
    id: "nextjs",
    options: {
      typescript: true,
    },
  },
  integrations: [{ id: "tailwind" }, { id: "prisma", options: { database: "sqlite" } }],
};

function expectInvalid(input: unknown, code: "CONFIG_INVALID" | "PROJECT_NAME_INVALID"): void {
  const result = parseRepoSetupConfig(input);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.code).toBe(code);
    expect(result.error.message.length).toBeGreaterThan(0);
  }
}

describe("parseRepoSetupConfig", () => {
  it("accepts the golden Next.js/SQLite example config", () => {
    const result = parseRepoSetupConfig(exampleConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.schemaVersion).toBe(1);
      expect(result.config.project.name).toBe("example-next-app");
      expect(result.config.packageManager).toBe("pnpm");
      expect(result.config.framework.id).toBe("nextjs");
      expect(result.config.integrations.map((integration) => integration.id)).toEqual([
        "tailwind",
        "sqlite",
        "prisma",
        "zod",
        "vitest",
        "prettier",
      ]);
    }
  });

  it("accepts a valid config with optional relative path and empty integrations", () => {
    const result = parseRepoSetupConfig({
      schemaVersion: 1,
      project: {
        name: "api",
        path: "apps/api",
      },
      runtime: {
        id: "python",
        version: "3.12",
      },
      packageManager: "uv",
      framework: {
        id: "fastapi",
      },
      integrations: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.project.path).toBe("apps/api");
      expect(result.config.runtime.version).toBe("3.12");
      expect(result.config.integrations).toEqual([]);
      expect("options" in result.config.framework).toBe(false);
    }
  });

  it("preserves integration and framework options", () => {
    const result = parseRepoSetupConfig(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.framework.options).toEqual({ typescript: true });
      expect(result.config.integrations[1]?.options).toEqual({ database: "sqlite" });
    }
  });

  it("rejects a non-object payload", () => {
    expectInvalid("not-json", "CONFIG_INVALID");
  });

  it("rejects a missing schemaVersion", () => {
    const rest = {
      project: validConfig.project,
      runtime: validConfig.runtime,
      packageManager: validConfig.packageManager,
      framework: validConfig.framework,
      integrations: validConfig.integrations,
    };
    expectInvalid(rest, "CONFIG_INVALID");
  });

  it("rejects an unsupported schemaVersion", () => {
    expectInvalid({ ...validConfig, schemaVersion: 2 }, "CONFIG_INVALID");
  });

  it("rejects unknown top-level properties", () => {
    expectInvalid({ ...validConfig, commands: ["rm -rf /"] }, "CONFIG_INVALID");
  });

  it("rejects an empty project name", () => {
    expectInvalid(
      {
        ...validConfig,
        project: { name: "" },
      },
      "PROJECT_NAME_INVALID",
    );
  });

  it("rejects a project name with path traversal", () => {
    expectInvalid(
      {
        ...validConfig,
        project: { name: ".." },
      },
      "PROJECT_NAME_INVALID",
    );
  });

  it("rejects a project name with a path separator", () => {
    expectInvalid(
      {
        ...validConfig,
        project: { name: "../evil" },
      },
      "PROJECT_NAME_INVALID",
    );
  });

  it("rejects an absolute project path", () => {
    expectInvalid(
      {
        ...validConfig,
        project: { name: "app", path: "/tmp/app" },
      },
      "CONFIG_INVALID",
    );
  });

  it("rejects a project path that escapes the project root", () => {
    expectInvalid(
      {
        ...validConfig,
        project: { name: "app", path: "apps/../../etc" },
      },
      "CONFIG_INVALID",
    );
  });

  it("rejects an unknown runtime", () => {
    expectInvalid(
      {
        ...validConfig,
        runtime: { id: "ruby" },
      },
      "CONFIG_INVALID",
    );
  });

  it("rejects an unknown package manager", () => {
    expectInvalid(
      {
        ...validConfig,
        packageManager: "yarn",
      },
      "CONFIG_INVALID",
    );
  });

  it("rejects a missing framework id", () => {
    expectInvalid(
      {
        ...validConfig,
        framework: { id: "" },
      },
      "CONFIG_INVALID",
    );
  });

  it("rejects an integration without an id", () => {
    expectInvalid(
      {
        ...validConfig,
        integrations: [{ options: { extra: true } }],
      },
      "CONFIG_INVALID",
    );
  });
});
