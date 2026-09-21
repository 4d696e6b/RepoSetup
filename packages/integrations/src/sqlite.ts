import {
  detectedResult,
  evidence,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";

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
});
