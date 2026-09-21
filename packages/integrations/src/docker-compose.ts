import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { firstExistingPath } from "./first-existing.js";
import { hasSelectedIntegration } from "./operations.js";
import { missingAnyFile } from "./verify.js";

const COMPOSE_PATHS = [
  "compose.yaml",
  "compose.yml",
  "docker-compose.yaml",
  "docker-compose.yml",
] as const;

const POSTGRES_COMPOSE = `# Official postgres image compose example (https://hub.docker.com/_/postgres)
# POSTGRES_PASSWORD is required by the image. This is a documented example value, not a production secret.

services:
  db:
    image: postgres
    restart: always
    shm_size: 128mb
    environment:
      POSTGRES_PASSWORD: example
`;

export const dockerComposeIntegration = defineIntegration({
  id: "docker-compose",
  name: "Docker Compose",
  category: "infrastructure",
  description: "Adds a Compose file for PostgreSQL. RepoSetup does not start containers.",
  status: "experimental",
  documentationUrl: "https://hub.docker.com/_/postgres",
  keywords: ["compose", "container", "postgres"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "docker" },
      reason: "Compose files are run with Docker.",
    },
    {
      kind: "requires",
      target: { type: "integration", id: "postgresql" },
      reason: "This phase writes the official PostgreSQL Compose service.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase supports Compose for Node.js projects." };
    }

    if (!context.integrationIds.includes("postgresql")) {
      return {
        supported: false,
        reason: "This phase writes Compose for PostgreSQL only.",
      };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const path = await firstExistingPath(context.files, COMPOSE_PATHS);
    if (path === undefined) {
      return notDetected();
    }

    return detectedResult("certain", [evidence("file", `Found ${path}`, path)]);
  },
  plan(context: PlanContext) {
    if (!hasSelectedIntegration(context, "postgresql")) {
      return [];
    }

    return [
      {
        type: "create_file",
        path: "compose.yaml",
        content: POSTGRES_COMPOSE,
        behavior: "fail_if_exists",
        description: "Add the official PostgreSQL Compose service",
      },
      {
        type: "show_message",
        message:
          "Compose was written but not started. Run docker compose up from a machine with Docker. RepoSetup will not start containers.",
        description: "Explain that Compose is not started automatically",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return (
      (await missingAnyFile(
        context,
        COMPOSE_PATHS,
        "a Compose file (compose.yaml or docker-compose.yml)",
      )) ?? { ok: true }
    );
  },
});
