import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  DeclarativeSelection,
  SelectionContext,
} from "../../packages/core/src/selection/format.js";
import { fixturePath, writeJson } from "./harness.js";

export interface MatrixContext {
  id: string;
  presetId: string;
  context: SelectionContext;
  optionalIds: string[];
  variants: string[][];
}
export interface SelectionMatrix {
  schemaVersion: 1;
  revision: string;
  catalogRevision: string;
  recipeRevision: string;
  cliContract: "selection-v1";
  limits: Record<string, number>;
  runtimes: { nodeMajor: number; pnpm: string; python: string[]; uv: string };
  platforms: { runner: string; platform: string; architecture: string }[];
  directVersions: Record<string, string[]>;
  contexts: MatrixContext[];
  planSha256: Record<string, string>;
}
export const matrixPath = fixturePath("selection-v1.matrix.json");
// This authored fixture is checked against the strict product schemas and catalog in selection-matrix.test.ts.
export const matrix = JSON.parse(readFileSync(matrixPath, "utf8")) as SelectionMatrix;
export const journeys = matrix.contexts.flatMap((context) =>
  context.variants.flatMap((ids, index) => {
    const modes = ids.length === 0 ? (["create"] as const) : (["create", "add"] as const);
    return modes.map((mode) => ({ id: `${context.id}/${mode}/${index}`, context, ids, mode }));
  }),
);

export function selectionFor(
  context: MatrixContext,
  ids: readonly string[],
  mode: "create" | "add",
): DeclarativeSelection {
  const common = {
    selectionVersion: 1 as const,
    cliContract: matrix.cliContract,
    catalogRevision: matrix.catalogRevision,
  };
  const integrations = ids.map((id) => ({ id, options: {} }));
  if (mode === "add") return { ...common, mode, context: context.context, integrations };
  return {
    ...common,
    mode,
    config: {
      schemaVersion: 1,
      project: { name: "qualified-app", path: "projects/qualified-app" },
      runtime: { id: context.context.runtimeId },
      packageManager: context.context.packageManager,
      framework: {
        id: context.context.frameworkId,
        ...(context.context.typescript === undefined ? {} : { options: { typescript: true } }),
      },
      integrations,
    },
  };
}

export function tokenFor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export const PRIVATE_MARKER = "private-fixture-value-must-not-appear";

export async function writeExistingContext(
  cwd: string,
  context: MatrixContext,
  satisfied = false,
): Promise<void> {
  // Detection-only fixtures, deliberately not advertised as runnable/locked applications.
  if (context.context.runtimeId === "python") {
    const dependencies = [
      "fastapi==0.141.1",
      ...(satisfied ? ["pydantic==2.0.0", "pytest==8.0.0", "ruff==0.9.0"] : []),
    ];
    await writeFile(
      path.join(cwd, "pyproject.toml"),
      `[project]\nname = "user-api"\ndependencies = ${JSON.stringify(dependencies)}\n`,
    );
    await writeFile(path.join(cwd, "uv.lock"), "version = 1\n");
    await writeFile(
      path.join(cwd, "main.py"),
      "from fastapi import FastAPI\napp = FastAPI()\n# keep user source\n",
    );
  } else {
    await writeJson(path.join(cwd, "package.json"), {
      name: "user-app",
      scripts: { test: "custom-user-test" },
      dependencies: {
        ...(context.context.frameworkId === "express"
          ? { express: "5.0.0" }
          : { react: "19.0.0", vite: "7.0.0" }),
        ...(satisfied ? { zod: "4.0.0" } : {}),
      },
      devDependencies: {
        typescript: "5.9.3",
        ...(satisfied ? { vitest: "4.0.0", prettier: "3.0.0" } : {}),
      },
    });
    await writeFile(path.join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(cwd, "tsconfig.json"), "{}\n");
    if (context.context.frameworkId === "react-vite")
      await writeFile(path.join(cwd, "vite.config.ts"), "export default {}\n");
    await writeFile(path.join(cwd, ".prettierrc"), '{"singleQuote":true}\n');
    await writeFile(path.join(cwd, ".prettierignore"), "custom-user-artifacts\n");
    await writeFile(path.join(cwd, "vitest.config.ts"), "// keep user config\n");
    await mkdir(path.join(cwd, "src"));
    await writeFile(path.join(cwd, "src/sample.ts"), "// keep user sample\n");
    await writeFile(path.join(cwd, "src/sample.test.ts"), "// keep user test\n");
  }
  await writeFile(path.join(cwd, ".env"), `PRIVATE_TOKEN=${PRIVATE_MARKER}\n`);
  await writeFile(path.join(cwd, "README.md"), "Keep the user's project notes.\n");
}
