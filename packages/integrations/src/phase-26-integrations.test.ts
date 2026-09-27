import {
  createDetectionContext,
  createMemoryDetectionFs,
  type PlanContext,
  type RepoSetupConfig,
  type SupportContext,
} from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { httpxIntegration } from "./httpx.js";
import { plannedCommandArgv } from "./planned-commands.js";
import { pydanticSettingsIntegration } from "./pydantic-settings.js";
import { tanstackQueryIntegration } from "./tanstack-query.js";
import { testingLibraryIntegration } from "./testing-library.js";

function context(
  overrides: {
    frameworkId?: string;
    packageManager?: RepoSetupConfig["packageManager"];
    runtimeId?: "node" | "python";
  } = {},
): PlanContext {
  const runtimeId = overrides.runtimeId ?? "node";
  return {
    config: {
      schemaVersion: 1,
      project: { name: "phase-26-demo" },
      runtime: { id: runtimeId },
      packageManager: overrides.packageManager ?? (runtimeId === "python" ? "uv" : "pnpm"),
      framework: {
        id: overrides.frameworkId ?? (runtimeId === "python" ? "fastapi" : "react-vite"),
      },
      integrations: [],
    },
    options: {},
    projectRoot: ".",
  };
}

function support(context: PlanContext): SupportContext {
  return {
    runtimeId: context.config.runtime.id,
    packageManager: context.config.packageManager,
    frameworkId: context.config.framework.id,
    integrationIds: [],
  };
}

describe("Phase 26 curated integration plans", () => {
  it("installs Testing Library with DOM and user-event plus an accessible interaction test", () => {
    const plan = testingLibraryIntegration.plan(context());
    expect(plannedCommandArgv(plan)).toEqual([
      [
        "pnpm",
        "add",
        "--save-dev",
        "@testing-library/react@16.3.3",
        "@testing-library/dom@10.4.2",
        "@testing-library/user-event@14.6.7",
        "jsdom@28.1.0",
      ],
    ]);
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: "src/testing-library-sample.tsx" }),
        expect.objectContaining({
          type: "create_file",
          path: "src/testing-library-sample.test.tsx",
          content: expect.stringContaining("getByRole('button'"),
        }),
      ]),
    );
  });

  it("installs TanStack Query as an app dependency with provider, request sample, and test", () => {
    const plan = tanstackQueryIntegration.plan(context());
    expect(plannedCommandArgv(plan)).toEqual([["pnpm", "add", "@tanstack/react-query@5.104.0"]]);
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: "src/reposetup-query-provider.tsx" }),
        expect.objectContaining({ type: "create_file", path: "src/tanstack-query-sample.tsx" }),
        expect.objectContaining({
          type: "create_file",
          path: "src/tanstack-query-sample.test.tsx",
        }),
      ]),
    );
  });

  it("installs HTTPX and Pydantic Settings for FastAPI with runnable validation samples", () => {
    const python = context({ runtimeId: "python" });
    expect(plannedCommandArgv(httpxIntegration.plan(python))).toEqual([
      ["uv", "add", "--dev", "httpx==0.28.1"],
    ]);
    expect(plannedCommandArgv(pydanticSettingsIntegration.plan(python))).toEqual([
      ["uv", "add", "pydantic-settings==2.15.0"],
    ]);
    expect(pydanticSettingsIntegration.plan(python)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: ".env.example" }),
        expect.objectContaining({ type: "create_file", path: "settings.py" }),
        expect.objectContaining({ type: "create_file", path: "test_settings.py" }),
      ]),
    );
  });

  it("refuses unqualified framework contexts before mutation", () => {
    expect(testingLibraryIntegration.supports(support(context({ frameworkId: "nextjs" })))).toEqual(
      expect.objectContaining({ supported: false }),
    );
    expect(tanstackQueryIntegration.supports(support(context({ frameworkId: "nextjs" })))).toEqual(
      expect.objectContaining({ supported: false }),
    );
    const flask = context({ runtimeId: "python", frameworkId: "flask" });
    expect(httpxIntegration.supports(support(flask))).toEqual(
      expect.objectContaining({ supported: false }),
    );
    expect(pydanticSettingsIntegration.supports(support(flask))).toEqual(
      expect.objectContaining({ supported: false }),
    );
  });

  it("detects only RepoSetup-owned Phase 26 artifacts, avoiding unsupported incidental packages", async () => {
    const reactPackage = JSON.stringify({
      dependencies: { "@tanstack/react-query": "5.104.0" },
      devDependencies: { "@testing-library/react": "16.3.3" },
    });
    const incidentalReact = await createDetectionContext(
      "/virtual/react",
      createMemoryDetectionFs({ "package.json": reactPackage }),
    );
    expect(await testingLibraryIntegration.detect?.(incidentalReact)).toEqual(
      expect.objectContaining({ detected: false }),
    );
    expect(await tanstackQueryIntegration.detect?.(incidentalReact)).toEqual(
      expect.objectContaining({ detected: false }),
    );

    const generatedReact = await createDetectionContext(
      "/virtual/react",
      createMemoryDetectionFs({
        "package.json": reactPackage,
        "src/testing-library-sample.test.tsx": "export {};\n",
        "src/reposetup-query-provider.tsx": "export {};\n",
      }),
    );
    expect(await testingLibraryIntegration.detect?.(generatedReact)).toEqual(
      expect.objectContaining({ detected: true }),
    );
    expect(await tanstackQueryIntegration.detect?.(generatedReact)).toEqual(
      expect.objectContaining({ detected: true }),
    );

    const pythonPackage = '[project]\ndependencies = ["httpx", "pydantic-settings"]\n';
    const incidentalPython = await createDetectionContext(
      "/virtual/python",
      createMemoryDetectionFs({ "pyproject.toml": pythonPackage }),
    );
    expect(await httpxIntegration.detect?.(incidentalPython)).toEqual(
      expect.objectContaining({ detected: false }),
    );
    expect(await pydanticSettingsIntegration.detect?.(incidentalPython)).toEqual(
      expect.objectContaining({ detected: false }),
    );

    const generatedPython = await createDetectionContext(
      "/virtual/python",
      createMemoryDetectionFs({
        "pyproject.toml": pythonPackage,
        "test_httpx.py": "",
        "settings.py": "",
      }),
    );
    expect(await httpxIntegration.detect?.(generatedPython)).toEqual(
      expect.objectContaining({ detected: true }),
    );
    expect(await pydanticSettingsIntegration.detect?.(generatedPython)).toEqual(
      expect.objectContaining({ detected: true }),
    );
  });
});
