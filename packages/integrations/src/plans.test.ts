import type { PlanContext, RepoSetupConfig } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { nextjsIntegration } from "./nextjs.js";
import { nodeIntegration } from "./node.js";
import { npmIntegration } from "./npm.js";
import { addPackages, execLocalBin, hasSelectedIntegration } from "./operations.js";
import { pnpmIntegration } from "./pnpm.js";
import { prettierIntegration } from "./prettier.js";
import { prismaIntegration } from "./prisma.js";
import { sqliteIntegration } from "./sqlite.js";
import { tailwindIntegration } from "./tailwind.js";
import { vitestIntegration } from "./vitest.js";
import { zodIntegration } from "./zod.js";

function planContext<TOptions = unknown>(
  overrides: {
    packageManager?: RepoSetupConfig["packageManager"];
    frameworkId?: string;
    frameworkOptions?: Record<string, unknown>;
    integrations?: RepoSetupConfig["integrations"];
    options?: TOptions;
    projectRoot?: PlanContext["projectRoot"];
  } = {},
): PlanContext<TOptions> {
  const framework: RepoSetupConfig["framework"] = {
    id: overrides.frameworkId ?? "nextjs",
  };
  if (overrides.frameworkOptions !== undefined) {
    framework.options = overrides.frameworkOptions;
  }

  return {
    config: {
      schemaVersion: 1,
      project: { name: "demo" },
      runtime: { id: "node" },
      packageManager: overrides.packageManager ?? "pnpm",
      framework,
      integrations: overrides.integrations ?? [],
    },
    options: (overrides.options ?? {}) as TOptions,
    projectRoot: overrides.projectRoot ?? ".",
  };
}

function runCommands(operations: ReturnType<typeof nextjsIntegration.plan>) {
  return operations
    .filter((operation) => operation.type === "run_command")
    .map((operation) => [operation.command, ...operation.args]);
}

describe("integration plans", () => {
  it("emits a Node.js prerequisite check", () => {
    expect(nodeIntegration.plan(planContext())).toEqual([
      expect.objectContaining({ type: "check_prerequisite", id: "node" }),
    ]);
  });

  it("emits npm and pnpm prerequisite checks", () => {
    expect(npmIntegration.plan(planContext({ packageManager: "npm" }))).toEqual([
      expect.objectContaining({ type: "check_prerequisite", id: "npm" }),
    ]);
    expect(pnpmIntegration.plan(planContext())).toEqual([
      expect.objectContaining({ type: "check_prerequisite", id: "pnpm" }),
    ]);
  });

  it("scaffolds Next.js with verified create-next-app flags", () => {
    expect(
      runCommands(nextjsIntegration.plan(planContext({ options: { typescript: true } }))),
    ).toEqual([
      [
        "pnpm",
        "create",
        "next-app@16.3.5",
        ".",
        "--ts",
        "--eslint",
        "--app",
        "--no-src-dir",
        "--no-tailwind",
        "--import-alias",
        "@/*",
        "--use-pnpm",
        "--yes",
      ],
    ]);

    expect(
      runCommands(
        nextjsIntegration.plan(
          planContext({
            packageManager: "npm",
            options: { typescript: false },
            projectRoot: "app",
          }),
        ),
      ),
    ).toEqual([
      [
        "npx",
        "--yes",
        "create-next-app@16.3.5",
        "app",
        "--js",
        "--eslint",
        "--app",
        "--no-src-dir",
        "--no-tailwind",
        "--import-alias",
        "@/*",
        "--use-npm",
        "--yes",
      ],
    ]);
  });

  it("installs the official Tailwind Vite plugin for React + Vite", () => {
    const plan = tailwindIntegration.plan(planContext({ frameworkId: "react-vite" }));
    expect(runCommands(plan)).toEqual([["pnpm", "add", "tailwindcss", "@tailwindcss/vite"]]);
    expect(plan).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "show_message" })]),
    );
  });

  it("installs Tailwind v4 PostCSS packages without --save-dev", () => {
    const plan = tailwindIntegration.plan(planContext());
    expect(runCommands(plan)).toEqual([
      ["pnpm", "add", "tailwindcss", "@tailwindcss/postcss", "postcss"],
    ]);
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "modify_text", path: "app/globals.css" }),
      ]),
    );
  });

  it("does not install a SQLite server package", () => {
    expect(sqliteIntegration.plan(planContext())).toEqual([
      expect.objectContaining({ type: "show_message" }),
    ]);
    expect(runCommands(sqliteIntegration.plan(planContext()))).toEqual([]);
  });

  it("initializes Prisma SQLite with the official adapter packages", () => {
    expect(runCommands(prismaIntegration.plan(planContext()))).toEqual([
      [
        "pnpm",
        "add",
        "--save-dev",
        "--allow-build=prisma",
        "--allow-build=@prisma/engines",
        "prisma@prev",
        "@types/better-sqlite3",
      ],
      [
        "pnpm",
        "add",
        "--allow-build=esbuild",
        "--allow-build=!better-sqlite3",
        "@prisma/client@7",
        "@prisma/adapter-better-sqlite3",
        "dotenv",
      ],
      [
        "pnpm",
        "exec",
        "prisma",
        "init",
        "--datasource-provider",
        "sqlite",
        "--output",
        "../generated/prisma",
      ],
      ["pnpm", "exec", "prisma", "generate"],
    ]);
  });

  it("installs Zod as a runtime dependency", () => {
    expect(runCommands(zodIntegration.plan(planContext()))).toEqual([["pnpm", "add", "zod"]]);
  });

  it("follows the Next.js Vitest guide for TypeScript and JavaScript", () => {
    expect(
      runCommands(vitestIntegration.plan(planContext({ frameworkOptions: { typescript: true } }))),
    ).toEqual([
      [
        "pnpm",
        "add",
        "--save-dev",
        "--allow-build=esbuild",
        "vitest",
        "@vitejs/plugin-react",
        "jsdom",
        "@testing-library/react",
        "@testing-library/dom",
        "vite-tsconfig-paths",
      ],
      ["pnpm", "exec", "vitest", "run", "--passWithNoTests"],
    ]);

    const javascriptPlan = vitestIntegration.plan(
      planContext({ frameworkOptions: { typescript: false } }),
    );
    expect(runCommands(javascriptPlan)).toEqual([
      [
        "pnpm",
        "add",
        "--save-dev",
        "--allow-build=esbuild",
        "vitest",
        "@vitejs/plugin-react",
        "jsdom",
        "@testing-library/react",
        "@testing-library/dom",
      ],
      ["pnpm", "exec", "vitest", "run", "--passWithNoTests"],
    ]);
    expect(javascriptPlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: "vitest.config.js" }),
      ]),
    );
  });

  it("installs Prettier as an exact dev dependency", () => {
    expect(runCommands(prettierIntegration.plan(planContext()))).toEqual([
      ["pnpm", "add", "--save-dev", "--save-exact", "prettier"],
    ]);
  });

  it("initializes Prisma PostgreSQL with the official adapter packages", () => {
    expect(
      runCommands(prismaIntegration.plan(planContext({ integrations: [{ id: "postgresql" }] }))),
    ).toEqual([
      [
        "pnpm",
        "add",
        "--save-dev",
        "--allow-build=prisma",
        "--allow-build=@prisma/engines",
        "prisma@prev",
        "@types/pg",
      ],
      [
        "pnpm",
        "add",
        "--allow-build=esbuild",
        "@prisma/client@7",
        "@prisma/adapter-pg",
        "pg",
        "dotenv",
      ],
      [
        "pnpm",
        "exec",
        "prisma",
        "init",
        "--datasource-provider",
        "postgresql",
        "--output",
        "../generated/prisma",
      ],
      ["pnpm", "exec", "prisma", "generate"],
    ]);
  });

  it("rejects Prisma unless SQLite or PostgreSQL is selected", () => {
    expect(
      prismaIntegration.supports({
        runtimeId: "node",
        packageManager: "pnpm",
        frameworkId: "nextjs",
        integrationIds: ["nextjs", "prisma"],
      }),
    ).toEqual({
      supported: false,
      reason: "This phase implements Prisma with SQLite or PostgreSQL.",
    });
  });
});

describe("operation helpers", () => {
  it("emits adapter argv arrays for package adds", () => {
    const operation = addPackages(planContext(), ["zod"], { description: "Install Zod" });
    expect(operation).toMatchObject({
      type: "run_command",
      command: "pnpm",
      args: ["add", "zod"],
      cwd: ".",
      requiresNetwork: true,
    });
  });

  it("runs local bins through pnpm exec or npx", () => {
    expect(
      execLocalBin(planContext(), "prisma", ["--version"], { description: "Show Prisma version" }),
    ).toMatchObject({
      type: "run_command",
      command: "pnpm",
      args: ["exec", "prisma", "--version"],
    });

    expect(
      execLocalBin(planContext({ packageManager: "npm" }), "prisma", ["--version"], {
        description: "Show Prisma version",
      }),
    ).toMatchObject({
      type: "run_command",
      command: "npx",
      args: ["prisma", "--version"],
    });
  });

  it("detects selected framework and integration ids", () => {
    const context = planContext({ integrations: [{ id: "tailwind" }] });
    expect(hasSelectedIntegration(context, "nextjs")).toBe(true);
    expect(hasSelectedIntegration(context, "tailwind")).toBe(true);
    expect(hasSelectedIntegration(context, "prisma")).toBe(false);
  });
});
