import {
  detectedResult,
  evidence,
  existingEnvKeys,
  notDetected,
  textDeclaresPythonPackage,
  type DetectionContext,
  type DetectionResult,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { DATABASE_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { pythonManifestText } from "./python-detect.js";
import { supportsNodeOrPython } from "./python-support.js";
import { failVerify, mergeVerify } from "./verify.js";

export const postgresqlIntegration = defineIntegration({
  id: "postgresql",
  name: "PostgreSQL",
  category: "database",
  description: "Selects PostgreSQL as the database. RepoSetup does not install a database server.",
  status: "experimental",
  documentationUrl:
    "https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql",
  keywords: ["database", "postgres", "sql"],
  verification: { verifiedAt: "2026-09-22" },
  conflicts: DATABASE_CONFLICTS,
  supports(context) {
    return supportsNodeOrPython(context);
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const schema = await context.files.readText("prisma/schema.prisma");
    const hasProvider = schema !== undefined && /provider\s*=\s*"postgresql"/.test(schema);
    const envExample = await context.files.readText(".env.example");
    const hasUrl = envExample !== undefined && /DATABASE_URL\s*=\s*"?postgresql:/.test(envExample);
    const sqlalchemyDeclared = textDeclaresPythonPackage(
      await pythonManifestText(context),
      "SQLAlchemy",
    );

    if (!hasProvider && !hasUrl && !sqlalchemyDeclared) {
      return notDetected();
    }

    const items = [];
    if (hasProvider) {
      items.push(
        evidence(
          "config",
          'prisma/schema.prisma uses provider = "postgresql"',
          "prisma/schema.prisma",
        ),
      );
    }
    if (hasUrl) {
      items.push(
        evidence("file", ".env.example documents a postgresql: DATABASE_URL", ".env.example"),
      );
    }
    if (sqlalchemyDeclared) {
      items.push(evidence("dependency", "project declares SQLAlchemy", "pyproject.toml"));
    }

    return detectedResult(hasProvider || hasUrl ? "certain" : "likely", items);
  },
  plan() {
    return [
      {
        type: "show_message",
        message:
          "PostgreSQL is a database server. RepoSetup will not install it. Provide DATABASE_URL or use Docker Compose.",
        description: "Explain that PostgreSQL is not installed automatically",
      },
      {
        type: "add_env_example",
        path: ".env.example",
        entries: [
          {
            key: "DATABASE_URL",
            placeholder: "postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public",
          },
        ],
        description: "Document the PostgreSQL DATABASE_URL placeholder",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    const schema = await context.files.readText("prisma/schema.prisma");
    const providerIssue =
      schema !== undefined && !/provider\s*=\s*"postgresql"/.test(schema)
        ? failVerify(
            'prisma/schema.prisma does not set provider = "postgresql".',
            'Use provider = "postgresql" for this database selection. Doctor does not rewrite schemas.',
          )
        : undefined;
    const env = await context.files.readText(".env.example");
    const envIssue =
      env !== undefined &&
      existingEnvKeys(env).has("DATABASE_URL") &&
      !/DATABASE_URL\s*=\s*"?postgresql:/.test(env)
        ? failVerify(
            ".env.example DATABASE_URL is not a postgresql: URL.",
            "Use a postgresql: DATABASE_URL placeholder. Doctor does not write env files.",
          )
        : undefined;

    return mergeVerify([providerIssue, envIssue]);
  },
});
