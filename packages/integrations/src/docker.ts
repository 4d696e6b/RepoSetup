import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { firstExistingPath } from "./first-existing.js";
import { defineIntegration } from "./define.js";
import { supportsNodeOrPython } from "./python-support.js";
import { missingAnyFile } from "./verify.js";

const DOCKER_PATHS = [
  "Dockerfile",
  "compose.yaml",
  "compose.yml",
  "docker-compose.yaml",
  "docker-compose.yml",
  "DOCKER_SETUP.md",
] as const;

const DOCKER_SETUP = `# Docker prerequisite

Selecting Docker records a system prerequisite. RepoSetup does not install
Docker, generate an application Dockerfile, pull images, or start containers.
Application packages are installed separately by the selected package manager.

1. Install Docker using https://docs.docker.com/get-docker/.
2. Confirm \`docker --version\` succeeds in your terminal.
3. Run \`rsetup doctor\` from this project to check the Docker CLI on PATH.

If you selected Docker Compose, RepoSetup writes \`compose.yaml\` and PostgreSQL
placeholders in \`.env.example\`. Install Compose using
https://docs.docker.com/compose/install/ and confirm \`docker compose version\`.
Create a local \`.env\` from the placeholders, set your own POSTGRES_PASSWORD,
and make DATABASE_URL match POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB and
POSTGRES_PORT. Keep real passwords out of version control.

Validate the configuration with \`docker compose config --quiet\`. When ready,
start Docker and run \`docker compose up -d db\` yourself. The database port is
published only on 127.0.0.1. Doctor checks CLI availability and configuration;
it does not prove the daemon is running or a database connection succeeds.
`;

export const dockerIntegration = defineIntegration({
  id: "docker",
  name: "Docker",
  category: "infrastructure",
  description: "Documents Docker as a prerequisite. RepoSetup does not install Docker.",
  status: "experimental",
  documentationUrl: "https://docs.docker.com/get-docker/",
  keywords: ["container", "infrastructure"],
  verification: { verifiedAt: "2026-09-22" },
  supports(context) {
    return supportsNodeOrPython(context);
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const dockerfile = await firstExistingPath(context.files, DOCKER_PATHS);
    if (dockerfile === undefined) {
      return notDetected();
    }

    return detectedResult("likely", [
      evidence("file", `Found Docker configuration: ${dockerfile}`, dockerfile),
    ]);
  },
  plan() {
    return [
      {
        type: "create_file",
        path: "DOCKER_SETUP.md",
        content: DOCKER_SETUP,
        behavior: "fail_if_exists",
        description: "Record Docker setup instructions without installing system software",
      },
      {
        type: "show_message",
        message:
          "Install Docker from https://docs.docker.com/get-docker/ and ensure docker is on PATH. RepoSetup will not install Docker or start containers.",
        description: "Explain that Docker is a system prerequisite",
      },
    ];
  },
  async verify(context) {
    const missing = await missingAnyFile(
      context,
      DOCKER_PATHS,
      "Docker configuration or DOCKER_SETUP.md prerequisite guidance",
    );
    if (missing !== undefined) return missing;
    return {
      ok: true,
      message:
        "Docker configuration or prerequisite guidance was found. Docker installation, the daemon, and containers are not verified by this configuration check.",
    };
  },
});
