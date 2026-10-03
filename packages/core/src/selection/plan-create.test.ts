import { describe, expect, it } from "vitest";
import { planSelectionCreate } from "./plan-create.js";
import { createMemoryDetectionFs } from "../detection/filesystem.js";
import { filterSatisfiedOperations } from "../planning/delta.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

const registry: RegistryLookup = {
  list: () => [],
  byCategory: () => [],
  get(id) {
    if (id !== "express") return undefined;
    return {
      id,
      name: id,
      category: "framework",
      status: "candidate",
      description: "fixture",
      documentationUrl: "https://expressjs.com/",
      supports: () => ({ supported: true }),
      plan: () => [
        {
          type: "create_file",
          path: "package.json",
          content: "{}",
          behavior: "fail_if_exists",
          description: "manifest",
        },
        {
          type: "run_command",
          command: "pnpm",
          args: ["install"],
          cwd: ".",
          description: "install",
        },
      ],
    };
  },
};
it("scopes every file/process target into the reserved project directory", () => {
  const result = planSelectionCreate(
    {
      schemaVersion: 1,
      project: { name: "app", path: "projects/app" },
      runtime: { id: "node" },
      framework: { id: "express" },
      packageManager: "pnpm",
      integrations: [],
    },
    registry,
  );
  expect(result.valid).toBe(true);
  expect(result.operations).toMatchObject([
    { type: "create_directory", path: "projects/app", behavior: "fail_if_exists" },
    { type: "create_file", path: "projects/app/package.json" },
    { type: "run_command", cwd: "projects/app" },
  ]);
});

describe("partial dependency deltas preserve existing user versions", () => {
  it("drops satisfied Node dependencies from a grouped install", async () => {
    const ops = await filterSatisfiedOperations(
      [
        {
          type: "install_package",
          packageManager: "pnpm",
          cwd: ".",
          packages: ["zod@4.6.5", "prettier@3.9.8"],
          description: "install",
        },
      ],
      createMemoryDetectionFs({}),
      {
        dependencies: { zod: "4.0.0-user-pin" },
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      },
    );
    expect(ops).toMatchObject([{ packages: ["prettier@3.9.8"] }]);
  });
  it("drops satisfied Python dependencies even when a companion dependency is missing", async () => {
    const ops = await filterSatisfiedOperations(
      [
        {
          type: "install_package",
          packageManager: "uv",
          cwd: ".",
          packages: ["pytest==9.0.0", "httpx==0.28.1"],
          description: "install",
        },
      ],
      createMemoryDetectionFs({
        "pyproject.toml": '[project]\ndependencies = ["pytest==8.0.0"]\n',
      }),
      undefined,
    );
    expect(ops).toMatchObject([{ packages: ["httpx==0.28.1"] }]);
  });
});
