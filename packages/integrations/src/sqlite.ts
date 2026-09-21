import {
  detectedResult,
  evidence,
  existingEnvKeys,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { DATABASE_CONFLICTS } from "./conflicts.js";
import { defineIntegration, VERIFIED_AT } from "./define.js";
import { failVerify, mergeVerify } from "./verify.js";

export const sqliteIntegration = defineIntegration({
  id: "sqlite",
  name: "SQLite",
  category: "database",
  description:
    "Selects SQLite as a file-based database. RepoSetup does not install a database server.",
  status: "experimental",
  documentationUrl: "https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/sqlite",
  keywords: ["database", "file", "libsql"],
  verification: { verifiedAt: VERIFIED_AT },
  conflicts: DATABASE_CONFLICTS,
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase supports SQLite with Node.js only." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const schema = await context.files.readText("prisma/schema.prisma");
    const hasSqliteProvider = schema !== undefined && /provider\s*=\s*"sqlite"/.test(schema);
    const envExample = await context.files.readText(".env.example");
    const hasFileUrl = envExample !== undefined && /DATABASE_URL\s*=\s*"?file:/.test(envExample);
    const pkg = context.packageJson;
    const hasSqliteDep =
      pkg !== undefined &&
      (hasPackageDependency(pkg, "better-sqlite3") || hasPackageDependency(pkg, "sqlite3"));

    if (!hasSqliteProvider && !hasFileUrl && !hasSqliteDep) {
      return notDetected();
    }

    const items = [];
    if (hasSqliteProvider) {
      items.push(
        evidence("config", 'prisma/schema.prisma uses provider = "sqlite"', "prisma/schema.prisma"),
      );
    }
    if (hasFileUrl) {
      items.push(evidence("file", ".env.example documents a file: DATABASE_URL", ".env.example"));
    }
    if (hasSqliteDep) {
      items.push(
        evidence("dependency", "package.json includes a SQLite driver package", "package.json"),
      );
    }

    const confidence = hasSqliteProvider ? "certain" : "likely";
    return detectedResult(confidence, items);
  },
  plan() {
    return [
      {
        type: "show_message",
        message:
          "SQLite is file-based. RepoSetup will not install a database server. Prisma uses DATABASE_URL=file:./dev.db.",
        description: "Explain that SQLite needs no system package",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    const schema = await context.files.readText("prisma/schema.prisma");
    const providerIssue =
      schema !== undefined && !/provider\s*=\s*"sqlite"/.test(schema)
        ? failVerify(
            'prisma/schema.prisma does not set provider = "sqlite".',
            'Use provider = "sqlite" for this database selection. Doctor does not rewrite schemas.',
          )
        : undefined;
    const env = await context.files.readText(".env.example");
    const envIssue =
      env !== undefined &&
      existingEnvKeys(env).has("DATABASE_URL") &&
      !/DATABASE_URL\s*=\s*"?file:/.test(env)
        ? failVerify(
            ".env.example DATABASE_URL is not a SQLite file: URL.",
            "Use a file: DATABASE_URL placeholder for SQLite. Doctor does not write env files.",
          )
        : undefined;

    return mergeVerify([providerIssue, envIssue]);
  },
});
