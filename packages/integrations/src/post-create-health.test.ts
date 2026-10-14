import { planInstallation, planInstallationSubset, type RepoSetupConfig } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";

const registry = createBuiltInRegistry();
const config = (framework: string, packageManager: "uv" | "pip"): RepoSetupConfig => ({
  schemaVersion: 1,
  project: { name: "health-api", path: "apps/health-api" },
  runtime: { id: "python" },
  packageManager,
  framework: { id: framework },
  integrations: [
    "postgresql",
    "pydantic",
    "sqlalchemy",
    "alembic",
    "pytest",
    "ruff",
    "httpx",
    "pydantic-settings",
  ]
    .filter((id) => framework === "fastapi" || !["httpx", "pydantic-settings"].includes(id))
    .map((id) => ({ id })),
});

describe("Python post-create health planning", () => {
  it.each(["fastapi", "flask"])(
    "records all selected dependencies for a pip %s project",
    (framework) => {
      const planned = planInstallation(config(framework, "pip"), registry);
      expect(planned.errors).toEqual([]);
      expect(planned.valid).toBe(true);
      const requirements = planned.operations.find(
        (operation) =>
          operation.type === "create_file" && operation.path.endsWith("requirements.txt"),
      );
      expect(requirements).toMatchObject({
        type: "create_file",
        path: "apps/health-api/requirements.txt",
        behavior: "fail_if_exists",
      });
      if (requirements?.type !== "create_file") throw new Error("Expected new pip manifest");
      const packages = planned.operations.flatMap((operation) =>
        operation.type === "install_package" ? operation.packages : [],
      );
      for (const spec of packages) expect(requirements.content.split("\n")).toContain(spec);
      expect(planned.operations.at(-1)).toMatchObject({
        type: "verify",
        command: "python",
        cwd: "apps/health-api",
      });
    },
  );
  it("does not overwrite an existing pip manifest when planning an add subset", () => {
    const planned = planInstallationSubset(config("fastapi", "pip"), registry, ["httpx"]);
    expect(planned.valid).toBe(true);
    expect(planned.operations).not.toContainEqual(
      expect.objectContaining({ path: "requirements.txt" }),
    );
    expect(planned.operations).not.toContainEqual(expect.objectContaining({ type: "verify" }));
  });
  it.each(["fastapi", "flask"])(
    "verifies uv %s without another dependency synchronization",
    (framework) => {
      const planned = planInstallation(config(framework, "uv"), registry);
      expect(planned.errors).toEqual([]);
      expect(planned.operations.at(-1)).toMatchObject({
        type: "verify",
        command: "uv",
        cwd: "apps/health-api",
        args: expect.arrayContaining(["--no-sync", "--offline", "--no-python-downloads"]),
      });
      expect(planned.operations).not.toContainEqual(
        expect.objectContaining({ path: "apps/health-api/requirements.txt" }),
      );
    },
  );
});
