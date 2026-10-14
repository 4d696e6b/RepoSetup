import {
  createDetectionContext,
  createMemoryDetectionFs,
  planInstallation,
  type PlanContext,
  type RepoSetupConfig,
} from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { createBuiltInRegistry } from "./catalog.js";
import { dockerComposeIntegration } from "./docker-compose.js";
import { dockerIntegration } from "./docker.js";

function context(
  runtime: "node" | "python" = "node",
  packageManager: RepoSetupConfig["packageManager"] = "npm",
): PlanContext {
  return {
    projectRoot: "apps/demo",
    options: {},
    config: {
      schemaVersion: 1,
      project: { name: "demo", path: "apps/demo" },
      runtime: { id: runtime },
      packageManager,
      framework: { id: runtime === "node" ? "express" : "fastapi" },
      integrations: ["postgresql", "docker", "docker-compose"].map((id) => ({ id })),
    },
  };
}

describe("Docker and Compose setup health", () => {
  it("does not report healthy Docker configuration without evidence", async () => {
    const detection = await createDetectionContext("/virtual/demo", createMemoryDetectionFs({}));
    expect(await dockerIntegration.verify?.(detection)).toMatchObject({ ok: false });
  });

  it("retains a Docker-only selection as discoverable prerequisite guidance", async () => {
    const operations = dockerIntegration.plan(context());
    const guidance = operations.find((operation) => operation.type === "create_file");
    expect(guidance).toMatchObject({
      path: "DOCKER_SETUP.md",
      behavior: "fail_if_exists",
    });
    if (guidance?.type !== "create_file") throw new Error("Expected Docker prerequisite guide");

    const detection = await createDetectionContext(
      "/virtual/demo",
      createMemoryDetectionFs({ [guidance.path]: guidance.content }),
    );
    expect(await dockerIntegration.detect?.(detection)).toMatchObject({
      detected: true,
      evidence: [expect.objectContaining({ path: "DOCKER_SETUP.md" })],
    });
    expect(await dockerIntegration.verify?.(detection)).toMatchObject({
      ok: true,
      message: expect.stringContaining("not verified by this configuration check"),
    });
    expect(operations).not.toContainEqual(expect.objectContaining({ type: "install_package" }));
    expect(operations).not.toContainEqual(expect.objectContaining({ type: "run_command" }));
    expect(operations).not.toContainEqual(expect.objectContaining({ path: "Dockerfile" }));
  });

  it.each([
    ["node", "npm"],
    ["node", "pnpm"],
    ["python", "pip"],
    ["python", "uv"],
  ] as const)("keeps %s/%s Compose files inside the chosen project", (runtime, manager) => {
    const planned = planInstallation(context(runtime, manager).config, createBuiltInRegistry());
    expect(planned.valid).toBe(true);
    expect(planned.errors).toEqual([]);
    expect(planned.operations).toContainEqual(
      expect.objectContaining({
        type: "create_file",
        path: "apps/demo/DOCKER_SETUP.md",
        behavior: "fail_if_exists",
      }),
    );
    expect(planned.operations).toContainEqual(
      expect.objectContaining({
        type: "create_file",
        path: "apps/demo/compose.yaml",
        behavior: "fail_if_exists",
      }),
    );
    expect(planned.operations).not.toContainEqual(
      expect.objectContaining({ type: "run_command", command: "docker" }),
    );
    expect(planned.operations).not.toContainEqual(
      expect.objectContaining({ type: "check_prerequisite", id: "docker" }),
    );
  });

  it("publishes PostgreSQL only on localhost and requires a chosen password", () => {
    const operations = dockerComposeIntegration.plan(context());
    const compose = operations.find((operation) => operation.type === "create_file");
    if (compose?.type !== "create_file") throw new Error("Expected Compose configuration");
    expect(compose.content).toContain('"127.0.0.1:${POSTGRES_PORT:-5432}:5432"');
    expect(compose.content).toContain("POSTGRES_USER: ${POSTGRES_USER:-USER}");
    expect(compose.content).toContain("POSTGRES_DB: ${POSTGRES_DB:-DATABASE}");
    expect(compose.content).toContain("POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?");
    expect(compose.content).not.toContain("POSTGRES_PASSWORD: example");
    expect(compose.content).toContain("postgres_data:/var/lib/postgresql");
    expect(compose.content).toContain("image: postgres:18.6");
  });

  it("adds Compose placeholders without replacing the selected database URL", () => {
    const operations = dockerComposeIntegration.plan(context("python", "uv"));
    const env = operations.find((operation) => operation.type === "add_env_example");
    expect(env).toMatchObject({
      path: ".env.example",
      entries: [
        { key: "POSTGRES_USER", placeholder: "USER" },
        { key: "POSTGRES_PASSWORD", placeholder: "PASSWORD" },
        { key: "POSTGRES_DB", placeholder: "DATABASE" },
        { key: "POSTGRES_PORT", placeholder: "5432" },
      ],
    });
    if (env?.type !== "add_env_example") throw new Error("Expected Compose placeholders");
    expect(env.entries.some((entry) => entry.key === "DATABASE_URL")).toBe(false);
    expect(operations).toContainEqual(
      expect.objectContaining({
        type: "show_message",
        message: expect.stringContaining("docker compose config --quiet"),
      }),
    );
  });

  it("distinguishes Compose configuration from installed or running services", async () => {
    const operations = dockerComposeIntegration.plan(context());
    const compose = operations.find((operation) => operation.type === "create_file");
    if (compose?.type !== "create_file") throw new Error("Expected Compose configuration");
    const detection = await createDetectionContext(
      "/virtual/demo",
      createMemoryDetectionFs({ [compose.path]: compose.content }),
    );
    expect(await dockerComposeIntegration.verify?.(detection)).toMatchObject({
      ok: true,
      message: expect.stringContaining("does not install Docker"),
    });
  });
});
