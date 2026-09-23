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

import { alembicIntegration } from "./alembic.js";
import { createBuiltInRegistry } from "./catalog.js";
import { dockerComposeIntegration } from "./docker-compose.js";
import { dockerIntegration } from "./docker.js";
import { fastapiIntegration } from "./fastapi.js";
import { flaskIntegration } from "./flask.js";
import { pipIntegration } from "./pip.js";
import { plannedCommandArgv } from "./planned-commands.js";
import { postgresqlIntegration } from "./postgresql.js";
import { pydanticIntegration } from "./pydantic.js";
import { pytestIntegration } from "./pytest.js";
import { pythonIntegration } from "./python.js";
import { ruffIntegration } from "./ruff.js";
import { sqlalchemyIntegration } from "./sqlalchemy.js";
import { uvIntegration } from "./uv.js";

const examplesRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../examples");

function planContext<TOptions = unknown>(
  overrides: {
    packageManager?: RepoSetupConfig["packageManager"];
    frameworkId?: string;
    integrations?: RepoSetupConfig["integrations"];
    options?: TOptions;
    projectName?: string;
    projectRoot?: PlanContext["projectRoot"];
  } = {},
): PlanContext<TOptions> {
  return {
    config: {
      schemaVersion: 1,
      project: { name: overrides.projectName ?? "demo" },
      runtime: { id: "python" },
      packageManager: overrides.packageManager ?? "uv",
      framework: { id: overrides.frameworkId ?? "fastapi" },
      integrations: overrides.integrations ?? [],
    },
    options: (overrides.options ?? {}) as TOptions,
    projectRoot: overrides.projectRoot ?? ".",
  };
}

function runCommands(operations: ReturnType<typeof fastapiIntegration.plan>) {
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

describe("Phase 14 Python ecosystem plans", () => {
  it("checks Python, uv, and pip as PATH prerequisites", () => {
    expect(pythonIntegration.plan(planContext())).toEqual([
      expect.objectContaining({ type: "check_prerequisite", id: "python" }),
    ]);
    expect(uvIntegration.plan(planContext())).toEqual([
      expect.objectContaining({ type: "check_prerequisite", id: "uv" }),
    ]);
    expect(pipIntegration.plan(planContext({ packageManager: "pip" }))).toEqual([
      expect.objectContaining({ type: "check_prerequisite", id: "pip" }),
    ]);
  });

  it("initializes FastAPI with official uv --bare then fastapi[standard]", () => {
    const plan = fastapiIntegration.plan(planContext({ projectName: "awesome-project" }));
    expect(runCommands(plan)).toEqual([
      ["uv", "init", ".", "--bare", "--name", "awesome-project"],
      ["uv", "add", "fastapi[standard]==0.141.1"],
    ]);
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "create_file", path: "main.py" }),
        expect.objectContaining({ type: "show_message" }),
      ]),
    );
  });

  it("installs Flask with the official package name and writes app.py", () => {
    const plan = flaskIntegration.plan(planContext({ frameworkId: "flask" }));
    expect(runCommands(plan)).toEqual([
      ["uv", "init", ".", "--bare", "--name", "demo"],
      ["uv", "add", "Flask==3.1.3"],
    ]);
    expect(plan).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "create_file", path: "app.py" })]),
    );
  });

  it("installs Pydantic, SQLAlchemy, pytest, and Ruff with official package specs", () => {
    expect(runCommands(pydanticIntegration.plan(planContext()))).toEqual([
      ["uv", "add", "pydantic==2.13.5"],
    ]);
    expect(
      runCommands(
        sqlalchemyIntegration.plan(planContext({ integrations: [{ id: "postgresql" }] })),
      ),
    ).toEqual([["uv", "add", "SQLAlchemy==2.0.54"]]);
    expect(runCommands(pytestIntegration.plan(planContext()))).toEqual([
      ["uv", "add", "--dev", "pytest==9.1.1"],
    ]);
    expect(runCommands(ruffIntegration.plan(planContext()))).toEqual([
      ["uv", "add", "--dev", "ruff==0.16.8"],
    ]);
  });

  it("initializes Alembic with uv run alembic init alembic", () => {
    expect(
      runCommands(alembicIntegration.plan(planContext({ integrations: [{ id: "sqlalchemy" }] }))),
    ).toEqual([
      ["uv", "add", "alembic==1.20.0"],
      ["uv", "run", "alembic", "init", "alembic"],
    ]);
  });

  it("does not install PostgreSQL, Docker, or a DBAPI", () => {
    expect(runCommands(postgresqlIntegration.plan(planContext()))).toEqual([]);
    expect(runCommands(dockerIntegration.plan(planContext()))).toEqual([]);
    expect(
      runCommands(
        dockerComposeIntegration.plan(planContext({ integrations: [{ id: "postgresql" }] })),
      ),
    ).toEqual([]);
    expect(sqlalchemyIntegration.plan(planContext())).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "show_message" })]),
    );
  });

  it("fixes Alembic's generated import ordering when Ruff is selected", () => {
    expect(
      runCommands(
        alembicIntegration.plan(
          planContext({ integrations: [{ id: "sqlalchemy" }, { id: "ruff" }] }),
        ),
      ),
    ).toEqual([
      ["uv", "add", "alembic==1.20.0"],
      ["uv", "run", "alembic", "init", "alembic"],
      ["uv", "run", "ruff", "check", "--fix", "alembic/env.py"],
    ]);
  });

  it("uses python -m pip install for the pip path", () => {
    expect(
      runCommands(
        flaskIntegration.plan(planContext({ packageManager: "pip", frameworkId: "flask" })),
      ),
    ).toEqual([["python", "-m", "pip", "install", "Flask==3.1.3"]]);
    expect(runCommands(alembicIntegration.plan(planContext({ packageManager: "pip" })))).toEqual([
      ["python", "-m", "pip", "install", "alembic==1.20.0"],
      ["alembic", "init", "alembic"],
    ]);
  });
});

describe("Phase 14 Python ecosystem detection and verify", () => {
  it("detects Python, uv, FastAPI, Flask, and Alembic", async () => {
    expect(
      await pythonIntegration.detect?.(
        await contextOf({ "pyproject.toml": "[project]\nname = 'demo'\n" }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));

    expect(await uvIntegration.detect?.(await contextOf({ "uv.lock": "version = 1\n" }))).toEqual(
      expect.objectContaining({ detected: true, confidence: "certain" }),
    );

    expect(
      await fastapiIntegration.detect?.(
        await contextOf({
          "pyproject.toml": '[project]\ndependencies = ["fastapi[standard]"]\n',
          "main.py": "from fastapi import FastAPI\n",
        }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));

    expect(
      await flaskIntegration.detect?.(
        await contextOf({
          "requirements.txt": "Flask==3.1.0\n",
          "app.py": "from flask import Flask\n",
        }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));

    expect(
      await alembicIntegration.detect?.(
        await contextOf({
          "pyproject.toml": '[project]\ndependencies = ["alembic"]\n',
          "alembic.ini": "[alembic]\n",
        }),
      ),
    ).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));
  });

  it("fails verify when expected Python packages or files are missing", async () => {
    const empty = await contextOf({ "pyproject.toml": "[project]\nname = 'demo'\n" });
    expect(await fastapiIntegration.verify?.(empty)).toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(await flaskIntegration.verify?.(empty)).toEqual(expect.objectContaining({ ok: false }));
    expect(await pydanticIntegration.verify?.(empty)).toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(await pytestIntegration.verify?.(empty)).toEqual(expect.objectContaining({ ok: false }));
    expect(await ruffIntegration.verify?.(empty)).toEqual(expect.objectContaining({ ok: false }));
    expect(await dockerIntegration.verify?.(empty)).toEqual({ ok: true });
  });
});

describe("Phase 14 example stacks", () => {
  it("plans the FastAPI golden example", () => {
    const result = planExample("reposetup.fastapi.json");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.orderedIntegrations.map((item) => item.id)).toEqual([
      "docker",
      "postgresql",
      "docker-compose",
      "python",
      "uv",
      "fastapi",
      "pydantic",
      "pytest",
      "ruff",
      "sqlalchemy",
      "alembic",
    ]);
    expect(runCommands(result.operations)).toEqual(
      expect.arrayContaining([
        ["uv", "init", ".", "--bare", "--name", "example-fastapi-app"],
        ["uv", "add", "fastapi[standard]==0.141.1"],
        ["uv", "add", "pydantic==2.13.5"],
        ["uv", "add", "SQLAlchemy==2.0.54"],
        ["uv", "add", "--dev", "pytest==9.1.1"],
        ["uv", "add", "--dev", "ruff==0.16.8"],
        ["uv", "run", "alembic", "init", "alembic"],
      ]),
    );
    expect(result.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "show_message" }),
        expect.objectContaining({ type: "create_file", path: "main.py" }),
        expect.objectContaining({ type: "create_file", path: "compose.yaml" }),
      ]),
    );
  });

  it("plans the Flask golden example", () => {
    const result = planExample("reposetup.flask.json");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.orderedIntegrations.map((item) => item.id)).toEqual([
      "docker",
      "postgresql",
      "docker-compose",
      "python",
      "uv",
      "flask",
      "pytest",
      "ruff",
      "sqlalchemy",
      "alembic",
    ]);
    expect(runCommands(result.operations)).toEqual(
      expect.arrayContaining([
        ["uv", "init", ".", "--bare", "--name", "example-flask-app"],
        ["uv", "add", "Flask==3.1.3"],
        ["uv", "run", "alembic", "init", "alembic"],
      ]),
    );
  });

  it("rejects FastAPI with Flask", () => {
    const result = planInstallation(
      {
        schemaVersion: 1,
        project: { name: "conflict" },
        runtime: { id: "python" },
        packageManager: "uv",
        framework: { id: "fastapi" },
        integrations: [{ id: "flask" }],
      },
      createBuiltInRegistry(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === "INTEGRATION_CONFLICT")).toBe(true);
  });
});
