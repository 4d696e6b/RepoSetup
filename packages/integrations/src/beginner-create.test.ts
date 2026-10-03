import { describe, expect, it } from "vitest";
import { planSelectionCreate } from "@reposetup/core";
import { BEGINNER_CATALOG } from "./beginner-catalog.js";
import { createBuiltInRegistry } from "./catalog.js";

describe("beginner create recipe regressions", () => {
  it.each([false, true])("advertises the FastAPI test command only when pytest=%s", (pytest) => {
    const preset = BEGINNER_CATALOG.presets.find(({ id }) => id === "beginner-fastapi")!;
    const result = planSelectionCreate(
      { ...preset.config, integrations: pytest ? [{ id: "pytest" }] : [] },
      createBuiltInRegistry(),
    );
    expect(result.valid).toBe(true);
    const readme = result.operations.find(
      (op) => op.type === "create_file" && op.path.endsWith("README.md"),
    );
    if (readme?.type !== "create_file") throw new Error("Missing FastAPI README");
    expect(readme.content.includes("uv run pytest")).toBe(pytest);
    expect(
      result.operations.some((op) => op.type === "create_file" && op.path.endsWith("test_main.py")),
    ).toBe(pytest);
  });

  it("installs the minimal React scaffold after the explicit esbuild policy", () => {
    const preset = BEGINNER_CATALOG.presets.find(({ id }) => id === "beginner-react-vite")!;
    const result = planSelectionCreate(preset.config, createBuiltInRegistry());
    expect(result.valid).toBe(true);
    const generator = result.operations.findIndex(
      (op) => op.type === "run_command" && op.args[0] === "create",
    );
    const policy = result.operations.findIndex(
      (op) => op.type === "create_file" && op.path.endsWith("pnpm-workspace.yaml"),
    );
    const installs = result.operations.filter(
      (op) => op.type === "run_command" && op.args[0] === "install",
    );
    expect(installs).toHaveLength(1);
    expect(result.operations.indexOf(installs[0]!)).toBeGreaterThan(policy);
    expect(policy).toBeGreaterThan(generator);
    expect(installs[0]).toMatchObject({ cwd: "my-frontend" });
    expect(BEGINNER_CATALOG.directVersions["react-vite"]).toEqual([
      "create-vite@8.3.0",
      "react@^19.2.0",
      "react-dom@^19.2.0",
      "vite@^7.3.1",
    ]);
  });

  it.each([false, true])("keeps the Express build entry stable with Vitest=%s", (vitest) => {
    const preset = BEGINNER_CATALOG.presets.find(({ id }) => id === "beginner-express")!;
    const result = planSelectionCreate(
      { ...preset.config, integrations: vitest ? [{ id: "vitest" }] : [] },
      createBuiltInRegistry(),
    );
    expect(result.valid).toBe(true);
    const config = result.operations.find(
      (op) => op.type === "create_file" && op.path.endsWith("tsconfig.json"),
    );
    if (config?.type !== "create_file") throw new Error("Missing Express tsconfig");
    expect(JSON.parse(config.content)).toMatchObject({
      compilerOptions: { rootDir: "." },
      exclude: ["node_modules", "dist", "**/*.test.ts"],
    });
    expect(JSON.stringify(result.operations)).toContain("esbuild");
    expect(result.operations).toContainEqual(
      expect.objectContaining({
        type: "modify_json",
        merge: {
          scripts: {
            dev: "tsx watch src/app.ts",
            build: "tsc --outDir dist",
            start: "node dist/src/app.js",
          },
        },
      }),
    );
  });
});
