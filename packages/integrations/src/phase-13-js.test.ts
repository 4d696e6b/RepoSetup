import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDetectionContext,
  createMemoryDetectionFs,
  parseRepoSetupConfig,
  planInstallation,
  type DetectionContext,
  type PlanContext,
  type RepoSetupConfig,
} from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";
import { dockerComposeIntegration } from "./docker-compose.js";
import { dockerIntegration } from "./docker.js";
import { drizzleIntegration } from "./drizzle.js";
import { eslintIntegration } from "./eslint.js";
import { expressIntegration } from "./express.js";
import { fastifyIntegration } from "./fastify.js";
import { githubActionsIntegration } from "./github-actions.js";
import { mongodbIntegration } from "./mongodb.js";
import { mongooseIntegration } from "./mongoose.js";
import { plannedCommandArgv } from "./planned-commands.js";
import { playwrightIntegration } from "./playwright.js";
import { postgresqlIntegration } from "./postgresql.js";
import { reactViteIntegration } from "./react-vite.js";
import { shadcnIntegration } from "./shadcn.js";
import { vitestIntegration } from "./vitest.js";

const examplesRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../examples");

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
    id: overrides.frameworkId ?? "express",
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

function runCommands(operations: ReturnType<typeof expressIntegration.plan>) {
  return plannedCommandArgv(operations);
}

async function contextOf(files: Record<string, string>): Promise<DetectionContext> {
  return createDetectionContext("/virtual/fixture", createMemoryDetectionFs(files));
}

function planExample(fileName: string) {
  const parsed = parseRepoSetupConfig(
    JSON.parse(readFileSync(join(examplesRoot, fileName), "utf8")),
  );
  expect(parsed.success).toBe(true);
  if (!parsed.success) {
    throw new Error("example config should parse");
  }
  return planInstallation(parsed.config, createBuiltInRegistry());
}

describe("Phase 13 JS ecosystem plans", () => {
  it("scaffolds React + Vite with official create-vite flags", () => {
    expect(
      runCommands(
        reactViteIntegration.plan(
          planContext({ frameworkId: "react-vite", options: { typescript: true } }),
        ),
      ),
    ).toEqual([
      ["pnpm", "create", "vite@8.3.0", ".", "--template", "react-ts", "--no-interactive"],
    ]);
    expect(
      reactViteIntegration.plan(
        planContext({ frameworkId: "react-vite", options: { typescript: true } }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "create_file",
          path: "pnpm-workspace.yaml",
          content: 'allowBuilds:\n  "esbuild": true\n',
        }),
      ]),
    );

    expect(
      runCommands(
        reactViteIntegration.plan(
          planContext({
            packageManager: "npm",
            frameworkId: "react-vite",
            options: { typescript: false },
            frameworkOptions: { typescript: false },
            projectRoot: "app",
          }),
        ),
      ),
    ).toEqual([
      ["npm", "create", "vite@8.3.0", "app", "--", "--template", "react", "--no-interactive"],
    ]);
  });

  it("installs Express and writes the official TypeScript Hello World", () => {
    const plan = expressIntegration.plan(
      planContext({ frameworkId: "express", options: { typescript: true } }),
    );
    expect(runCommands(plan)).toEqual([
      ["pnpm", "add", "express@5.2.1"],
      [
        "pnpm",
        "add",
        "--save-dev",
        "typescript@5.9.3",
        "@types/express@5.0.6",
        "@types/node@22.20.4",
        "tsx@4.23.15",
      ],
    ]);
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: "package.json" }),
        expect.objectContaining({ type: "create_file", path: "src/app.ts" }),
        expect.objectContaining({ type: "modify_json", path: "package.json" }),
        expect.objectContaining({ type: "create_file", path: "README.md" }),
      ]),
    );
  });

  it("adds an HTTP response test when Express is configured with Vitest", () => {
    const plan = expressIntegration.plan(
      planContext({
        frameworkId: "express",
        options: { typescript: true },
        integrations: [{ id: "vitest" }],
      }),
    );

    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "create_file",
          path: "src/app.test.ts",
          content: expect.stringContaining("fetch(origin)"),
        }),
      ]),
    );
  });

  it("installs Fastify and writes the official first server", () => {
    const plan = fastifyIntegration.plan(
      planContext({ frameworkId: "fastify", options: { typescript: true } }),
    );
    expect(runCommands(plan)).toEqual([
      ["pnpm", "add", "fastify@5.12.5"],
      [
        "pnpm",
        "add",
        "--save-dev",
        "--allow-build=esbuild",
        "typescript@5.9.3",
        "@types/node@22.20.4",
        "tsx@4.23.15",
      ],
    ]);
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: "src/server.ts" }),
      ]),
    );
    expect(JSON.stringify(plan)).toContain("tsx watch src/server.ts");
    const tested = fastifyIntegration.plan(
      planContext({
        frameworkId: "fastify",
        options: { typescript: true },
        integrations: [{ id: "vitest" }],
      }),
    );
    expect(tested).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "create_file",
          path: "src/server.test.ts",
          content: expect.stringContaining("app.inject"),
        }),
      ]),
    );
  });

  it("does not install PostgreSQL or MongoDB servers", () => {
    expect(runCommands(postgresqlIntegration.plan(planContext()))).toEqual([]);
    expect(runCommands(mongodbIntegration.plan(planContext()))).toEqual([]);
    expect(postgresqlIntegration.plan(planContext())).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "show_message" })]),
    );
    expect(mongodbIntegration.plan(planContext())).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "show_message" })]),
    );
  });

  it("installs Drizzle with the official node-postgres packages", () => {
    expect(
      runCommands(drizzleIntegration.plan(planContext({ integrations: [{ id: "postgresql" }] }))),
    ).toEqual([
      ["pnpm", "add", "drizzle-orm@0.45.3", "pg@8.23.0", "dotenv@18.0.3"],
      [
        "pnpm",
        "add",
        "--save-dev",
        "--allow-build=esbuild",
        "drizzle-kit@0.31.11",
        "tsx@4.23.15",
        "@types/pg@8.23.1",
      ],
    ]);
    expect(
      drizzleIntegration.plan(
        planContext({ integrations: [{ id: "postgresql" }, { id: "vitest" }] }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "create_file",
          path: "src/db/schema.test.ts",
          content: expect.stringContaining("getTableName"),
        }),
      ]),
    );
  });

  it("installs Mongoose and a connection helper", () => {
    const plan = mongooseIntegration.plan(planContext({ integrations: [{ id: "mongodb" }] }));
    expect(runCommands(plan)).toEqual([["pnpm", "add", "mongoose@9.10.2"]]);
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: "src/mongoose.js" }),
      ]),
    );
  });

  it("initializes Playwright without downloading browsers", () => {
    expect(
      runCommands(
        playwrightIntegration.plan(planContext({ frameworkOptions: { typescript: true } })),
      ),
    ).toEqual([
      [
        "pnpm",
        "create",
        "playwright@1.17.139",
        ".",
        "--quiet",
        "--lang=TypeScript",
        "--no-browsers",
      ],
      ["pnpm", "add", "--save-dev", "@playwright/test@1.63.0"],
    ]);
    expect(playwrightIntegration.plan(planContext())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "show_message",
          message: expect.stringContaining("pnpm exec playwright install"),
        }),
      ]),
    );
    expect(playwrightIntegration.plan(planContext({ packageManager: "npm" }))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "show_message",
          message: expect.stringContaining("npx playwright install"),
        }),
      ]),
    );
  });

  it("installs ESLint with the official recommended packages for TypeScript", () => {
    expect(runCommands(eslintIntegration.plan(planContext()))).toEqual([
      [
        "pnpm",
        "add",
        "--save-dev",
        "eslint@9.39.5",
        "@eslint/js@9.39.5",
        "typescript-eslint@8.70.1",
      ],
      ["pnpm", "exec", "eslint", "."],
    ]);
    expect(eslintIntegration.plan(planContext())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "modify_json",
          merge: { scripts: { lint: "eslint ." } },
        }),
      ]),
    );
  });

  it("does not install TypeScript ESLint for JavaScript projects", () => {
    expect(
      runCommands(eslintIntegration.plan(planContext({ frameworkOptions: { typescript: false } }))),
    ).toEqual([
      ["pnpm", "add", "--save-dev", "eslint@9.39.5", "@eslint/js@9.39.5"],
      ["pnpm", "exec", "eslint", "."],
    ]);
  });

  it("initializes shadcn/ui with the documented --yes template flags", () => {
    expect(runCommands(shadcnIntegration.plan(planContext({ frameworkId: "nextjs" })))).toEqual([
      ["pnpm", "dlx", "shadcn@4.21.0", "init", "--yes", "-t", "next"],
    ]);
    expect(runCommands(shadcnIntegration.plan(planContext({ frameworkId: "react-vite" })))).toEqual(
      [["pnpm", "dlx", "shadcn@4.21.0", "init", "--yes", "-t", "vite"]],
    );
    expect(
      runCommands(
        shadcnIntegration.plan(planContext({ packageManager: "npm", frameworkId: "nextjs" })),
      ),
    ).toEqual([["npx", "--yes", "shadcn@4.21.0", "init", "--yes", "-t", "next"]]);
  });

  it("does not install Docker and writes Compose without starting it", () => {
    expect(runCommands(dockerIntegration.plan(planContext()))).toEqual([]);
    const compose = dockerComposeIntegration.plan(
      planContext({ integrations: [{ id: "postgresql" }] }),
    );
    expect(runCommands(compose)).toEqual([]);
    expect(compose).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: "compose.yaml" }),
        expect.objectContaining({ type: "show_message" }),
      ]),
    );
  });

  it("writes a pnpm GitHub Actions workflow", () => {
    const plan = githubActionsIntegration.plan(planContext());
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "create_file",
          path: ".github/workflows/node.js.yml",
        }),
      ]),
    );
    const file = plan.find((operation) => operation.type === "create_file");
    const content = file?.type === "create_file" ? file.content : "";
    expect(content).toContain("pnpm/action-setup@v4");
    expect(content).toContain('node-version: "24"');
    expect(content).toContain("pnpm run build");
    expect(content).not.toContain("pnpm test");

    const tested = githubActionsIntegration.plan(planContext({ integrations: [{ id: "vitest" }] }));
    const testedFile = tested.find((operation) => operation.type === "create_file");
    expect(testedFile?.type === "create_file" ? testedFile.content : "").toContain("pnpm test");
  });

  it("installs Vitest only for non-Next.js frameworks", () => {
    expect(runCommands(vitestIntegration.plan(planContext({ frameworkId: "express" })))).toEqual([
      ["pnpm", "add", "--save-dev", "--allow-build=esbuild", "vitest@5.0.1"],
    ]);
  });
});

describe("Phase 13 JS ecosystem detection and verify", () => {
  it("detects React + Vite as certain from vite and react", async () => {
    const result = await reactViteIntegration.detect?.(
      await contextOf({
        "package.json": JSON.stringify({ dependencies: { vite: "6.0.0", react: "19.0.0" } }),
        "vite.config.ts": "export default {};\n",
      }),
    );
    expect(result).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));
  });

  it("does not treat a Next.js react dependency as React + Vite", async () => {
    const result = await reactViteIntegration.detect?.(
      await contextOf({
        "package.json": JSON.stringify({ dependencies: { next: "16.0.0", react: "19.0.0" } }),
        "next.config.mjs": "export default {};\n",
      }),
    );
    expect(result).toEqual(expect.objectContaining({ detected: false }));
  });

  it("detects Express, Fastify, PostgreSQL, MongoDB, and GitHub Actions", async () => {
    expect(
      await expressIntegration.detect?.(
        await contextOf({
          "package.json": JSON.stringify({ dependencies: { express: "5.0.0" } }),
        }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));

    expect(
      await fastifyIntegration.detect?.(
        await contextOf({
          "package.json": JSON.stringify({ dependencies: { fastify: "5.0.0" } }),
        }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));

    expect(
      await postgresqlIntegration.detect?.(
        await contextOf({
          "prisma/schema.prisma": 'datasource db {\n  provider = "postgresql"\n}\n',
        }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));

    expect(
      await mongodbIntegration.detect?.(
        await contextOf({
          "package.json": JSON.stringify({ dependencies: { mongoose: "8.0.0" } }),
        }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));

    expect(
      await githubActionsIntegration.detect?.(
        await contextOf({ ".github/workflows/ci.yml": "name: CI\n" }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "likely" }));
  });

  it("fails verify when expected packages or files are missing", async () => {
    const empty = await contextOf({ "package.json": JSON.stringify({ name: "app" }) });
    expect(await expressIntegration.verify?.(empty)).toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(await reactViteIntegration.verify?.(empty)).toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(await eslintIntegration.verify?.(empty)).toEqual(expect.objectContaining({ ok: false }));
    expect(await dockerIntegration.verify?.(empty)).toEqual({ ok: true });
  });
});

describe("Phase 13 example stacks", () => {
  it("plans the React + Vite example", () => {
    const result = planExample("reposetup.react-vite.json");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.orderedIntegrations.map((item) => item.id)).toEqual([
      "node",
      "pnpm",
      "react-vite",
      "eslint",
      "prettier",
      "tailwind",
      "shadcn",
      "vitest",
    ]);
    expect(runCommands(result.operations)).toEqual(
      expect.arrayContaining([
        ["pnpm", "create", "vite@8.3.0", ".", "--template", "react-ts", "--no-interactive"],
        ["pnpm", "install", "--no-frozen-lockfile", "--prefer-offline"],
        ["pnpm", "dlx", "shadcn@4.21.0", "init", "--yes", "-t", "vite"],
      ]),
    );
  });

  it("plans the Express + PostgreSQL example", () => {
    const result = planExample("reposetup.express-postgres.json");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.orderedIntegrations.map((item) => item.id)).toEqual([
      "docker",
      "node",
      "pnpm",
      "express",
      "github-actions",
      "postgresql",
      "docker-compose",
      "prettier",
      "prisma",
      "zod",
    ]);
    expect(runCommands(result.operations)).toEqual(
      expect.arrayContaining([
        ["pnpm", "install", "--no-frozen-lockfile", "--prefer-offline"],
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
      ]),
    );
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "show_message" }),
        expect.objectContaining({ type: "create_file", path: "compose.yaml" }),
        expect.objectContaining({
          type: "create_file",
          path: ".github/workflows/node.js.yml",
        }),
      ]),
    );
  });

  it("plans the Fastify + MongoDB example", () => {
    const result = planExample("reposetup.fastify-mongo.json");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.orderedIntegrations.map((item) => item.id)).toEqual([
      "mongodb",
      "node",
      "pnpm",
      "fastify",
      "mongoose",
      "playwright",
      "vitest",
    ]);
  });

  it("rejects Next.js with React + Vite and Prisma with Drizzle", () => {
    const nextAndVite = planInstallation(
      {
        schemaVersion: 1,
        project: { name: "conflict" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "nextjs" },
        integrations: [{ id: "react-vite" }],
      },
      createBuiltInRegistry(),
    );
    expect(nextAndVite.valid).toBe(false);
    expect(nextAndVite.errors.some((error) => error.code === "INTEGRATION_CONFLICT")).toBe(true);

    const twoOrms = planInstallation(
      {
        schemaVersion: 1,
        project: { name: "conflict" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "express" },
        integrations: [{ id: "postgresql" }, { id: "prisma" }, { id: "drizzle" }],
      },
      createBuiltInRegistry(),
    );
    expect(twoOrms.valid).toBe(false);
    expect(twoOrms.errors.some((error) => error.code === "INTEGRATION_CONFLICT")).toBe(true);
  });
});
