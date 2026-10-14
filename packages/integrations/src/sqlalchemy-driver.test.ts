import {
  createDetectionContext,
  createMemoryDetectionFs,
  planInstallation,
  type PlanContext,
  type VerificationContext,
} from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";
import { plannedCommandArgv } from "./planned-commands.js";
import { postgresqlIntegration } from "./postgresql.js";
import { pythonAppReadme } from "./python-readme.js";
import { sqlalchemyIntegration } from "./sqlalchemy.js";

function context(packageManager: "uv" | "pip", framework = "fastapi"): PlanContext {
  return {
    config: {
      schemaVersion: 1,
      project: { name: "database-app" },
      runtime: { id: "python" },
      packageManager,
      framework: { id: framework },
      integrations: [{ id: "postgresql" }, { id: "sqlalchemy" }],
    },
    projectRoot: ".",
    options: {},
  };
}

async function verification(requirements: string, url: string): Promise<VerificationContext> {
  return createDetectionContext(
    "/virtual/database-app",
    createMemoryDetectionFs({
      "requirements.txt": requirements,
      ".env.example": `DATABASE_URL=${url}\n`,
    }),
  );
}

describe("SQLAlchemy PostgreSQL driver", () => {
  it.each(["uv", "pip"] as const)(
    "installs the self-contained driver with %s and preserves an existing helper",
    (packageManager) => {
      const operations = sqlalchemyIntegration.plan(context(packageManager));
      const installArgs =
        packageManager === "uv"
          ? ["uv", "add", "SQLAlchemy==2.0.54", "psycopg[binary]==3.3.6"]
          : ["python", "-m", "pip", "install", "SQLAlchemy==2.0.54", "psycopg[binary]==3.3.6"];
      expect(plannedCommandArgv(operations)).toEqual([installArgs]);
      expect(operations).toContainEqual(
        expect.objectContaining({
          type: "create_file",
          path: "database.py",
          behavior: "fail_if_exists",
          content: expect.stringContaining("return create_engine(connection_url)"),
        }),
      );
      // Engine construction is lazy: scaffolding must never connect to a live database.
      const helper = operations.find((operation) => operation.type === "create_file");
      expect(helper?.type === "create_file" ? helper.content : "").not.toContain(".connect(");
    },
  );

  it.each(["fastapi", "flask"])(
    "selects the installed Psycopg dialect for %s and documents server requirements",
    (framework) => {
      const planContext = context("uv", framework);
      expect(postgresqlIntegration.plan(planContext)).toContainEqual(
        expect.objectContaining({
          type: "add_env_example",
          entries: [
            {
              key: "DATABASE_URL",
              placeholder: "postgresql+psycopg://USER:PASSWORD@localhost:5432/DATABASE",
            },
          ],
        }),
      );
      const readme = pythonAppReadme(planContext, framework, "start");
      expect(readme).toContain("postgresql+psycopg://");
      expect(readme).toContain("database.py");
      expect(readme).toContain("does not install or start that server");
    },
  );

  it("keeps the Node Prisma PostgreSQL URL unchanged", () => {
    const planContext = context("uv");
    planContext.config.runtime = { id: "node" };
    planContext.config.packageManager = "npm";
    planContext.config.framework = { id: "express" };
    planContext.config.integrations = [{ id: "postgresql" }, { id: "prisma" }];
    expect(postgresqlIntegration.plan(planContext)).toContainEqual(
      expect.objectContaining({
        type: "add_env_example",
        entries: [
          {
            key: "DATABASE_URL",
            placeholder: "postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public",
          },
        ],
      }),
    );
  });

  it("uses the IPv4 loopback interface published by a selected Compose service", () => {
    const planContext = context("uv");
    planContext.config.integrations.push({ id: "docker" }, { id: "docker-compose" });
    expect(postgresqlIntegration.plan(planContext)).toContainEqual(
      expect.objectContaining({
        type: "add_env_example",
        entries: [
          {
            key: "DATABASE_URL",
            placeholder: "postgresql+psycopg://USER:PASSWORD@127.0.0.1:5432/DATABASE",
          },
        ],
      }),
    );
  });

  it.each([
    ["SQLAlchemy==2.0.54\n", "postgresql+psycopg://USER:PASSWORD@localhost/db", false],
    [
      "SQLAlchemy==2.0.54\npsycopg[binary]==3.3.6\n",
      "postgresql+psycopg://USER:PASSWORD@localhost/db",
      true,
    ],
    ["SQLAlchemy==2.0.54\n", "postgresql://USER:PASSWORD@localhost/db", false],
    [
      "SQLAlchemy==2.0.54\npsycopg[binary]==3.3.6\n",
      "postgresql://USER:PASSWORD@localhost/db",
      false,
    ],
    [
      "SQLAlchemy==2.0.54\npsycopg2-binary==2.9.11\n",
      "postgresql://USER:PASSWORD@localhost/db",
      true,
    ],
    [
      "SQLAlchemy==2.0.54\npsycopg2==2.9.11\n",
      "postgresql+psycopg2://USER:PASSWORD@localhost/db",
      true,
    ],
  ] as const)("checks the driver selected by %s / %s", async (requirements, url, ok) => {
    expect(await sqlalchemyIntegration.verify?.(await verification(requirements, url))).toEqual(
      expect.objectContaining({ ok }),
    );
  });

  it("detects and accepts an explicit PostgreSQL driver URL", async () => {
    const selected = await verification(
      "SQLAlchemy==2.0.54\npsycopg[binary]==3.3.6\n",
      "postgresql+psycopg://USER:PASSWORD@localhost/db",
    );
    expect(await postgresqlIntegration.detect?.(selected)).toEqual(
      expect.objectContaining({ detected: true, confidence: "certain" }),
    );
    expect(await postgresqlIntegration.verify?.(selected)).toEqual({ ok: true });
  });

  it.each(["uv", "pip"] as const)(
    "plans the driver install before the final installed dependency check with %s",
    (packageManager) => {
      const planned = planInstallation(context(packageManager).config, createBuiltInRegistry());
      expect(planned.valid, JSON.stringify(planned.errors)).toBe(true);
      expect(plannedCommandArgv(planned.operations).flat()).toContain("psycopg[binary]==3.3.6");
      if (packageManager === "pip")
        expect(planned.operations).toContainEqual(
          expect.objectContaining({
            type: "create_file",
            path: "requirements.txt",
            content: expect.stringContaining("psycopg[binary]==3.3.6"),
          }),
        );
    },
  );
});
