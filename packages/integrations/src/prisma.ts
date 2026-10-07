import {
  detectedResult,
  evidence,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { ORM_CONFLICTS } from "./conflicts.js";
import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, execLocalBin, hasSelectedIntegration } from "./operations.js";
import { QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { failVerify, mergeVerify, missingAnyFile, missingEnvKeys } from "./verify.js";

const PRISMA_SQLITE_CLIENT = `import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = \`\${process.env.DATABASE_URL}\`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
`;

const PRISMA_POSTGRES_CLIENT = `import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = \`\${process.env.DATABASE_URL}\`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
`;

export const prismaIntegration = defineIntegration({
  id: "prisma",
  name: "Prisma",
  category: "orm",
  description: "Adds Prisma ORM with the SQLite or PostgreSQL driver adapter.",
  status: "candidate",
  documentationUrl: "https://www.prisma.io/docs/v7/prisma-orm/add-to-existing-project/sqlite",
  keywords: ["orm", "sqlite", "postgresql", "migrate"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "database" },
      reason: "Prisma needs a selected database. This phase implements SQLite and PostgreSQL.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Prisma is added to the scaffolded application.",
    },
  ],
  conflicts: ORM_CONFLICTS,
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase supports Prisma with Node.js only." };
    }

    if (context.packageManager !== "npm" && context.packageManager !== "pnpm") {
      return { supported: false, reason: "This phase supports npm and pnpm only." };
    }

    const hasSqlite = context.integrationIds.includes("sqlite");
    const hasPostgres = context.integrationIds.includes("postgresql");
    if (!hasSqlite && !hasPostgres) {
      return {
        supported: false,
        reason: "This phase implements Prisma with SQLite or PostgreSQL.",
      };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const pkg = context.packageJson;
    const hasPrismaDep =
      pkg !== undefined &&
      (hasPackageDependency(pkg, "prisma") || hasPackageDependency(pkg, "@prisma/client"));
    const hasSchema = await context.files.exists("prisma/schema.prisma");

    if (!hasPrismaDep && !hasSchema) {
      return notDetected();
    }

    const items = [];
    if (hasPrismaDep) {
      items.push(
        evidence("dependency", "package.json includes prisma or @prisma/client", "package.json"),
      );
    }
    if (hasSchema) {
      items.push(evidence("file", "Found prisma/schema.prisma", "prisma/schema.prisma"));
    }

    return detectedResult(hasPrismaDep && hasSchema ? "certain" : "likely", items);
  },
  plan(context) {
    if (hasSelectedIntegration(context, "postgresql")) {
      return postgresPlan(context);
    }

    return sqlitePlan(context);
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    const pkg = context.packageJson;
    const hasPrismaDep =
      pkg !== undefined &&
      (hasPackageDependency(pkg, "prisma") || hasPackageDependency(pkg, "@prisma/client"));
    const missingDeps = hasPrismaDep
      ? undefined
      : failVerify(
          "package.json does not include prisma or @prisma/client.",
          "Add prisma and @prisma/client. Doctor does not install packages.",
        );

    return mergeVerify([
      missingDeps,
      await missingAnyFile(context, ["prisma/schema.prisma"], "prisma/schema.prisma"),
      await missingAnyFile(
        context,
        ["generated/prisma/client.ts", "generated/prisma/index.ts"],
        "generated Prisma Client output (run prisma generate)",
      ),
      await missingEnvKeys(context, ".env.example", ["DATABASE_URL"]),
    ]);
  },
});

function sqlitePlan(context: PlanContext) {
  // Official SQLite quickstart uses prisma@prev and @prisma/client@7. Those tags
  // resolved to 7.10.0 on 2026-09-23; the exact versions keep the init flags stable.
  return [
    addPackages(
      context,
      [
        npmPin("prisma", QUALIFIED_VERSIONS.prisma),
        npmPin("@types/better-sqlite3", QUALIFIED_VERSIONS.typesBetterSqlite3),
      ],
      {
        description: "Install Prisma CLI and better-sqlite3 types",
        dev: true,
        allowBuild: ["prisma", "@prisma/engines"],
      },
    ),
    addPackages(
      context,
      [
        npmPin("@prisma/client", QUALIFIED_VERSIONS.prismaClient),
        npmPin("@prisma/adapter-better-sqlite3", QUALIFIED_VERSIONS.prismaAdapterSqlite),
        npmPin("dotenv", QUALIFIED_VERSIONS.dotenv),
      ],
      {
        description: "Install Prisma Client, the SQLite adapter, and dotenv",
        allowBuild: ["esbuild", "better-sqlite3"],
      },
    ),
    execLocalBin(
      context,
      "prisma",
      ["init", "--datasource-provider", "sqlite", "--output", "../generated/prisma"],
      { description: "Initialize Prisma with the SQLite provider" },
    ),
    {
      type: "add_env_example" as const,
      path: ".env.example",
      entries: [{ key: "DATABASE_URL", placeholder: "file:./dev.db" }],
      description: "Document the SQLite DATABASE_URL placeholder",
    },
    {
      type: "create_file" as const,
      path: "lib/prisma.ts",
      content: PRISMA_SQLITE_CLIENT,
      behavior: "fail_if_exists" as const,
      description: "Add a Prisma Client helper that uses the SQLite adapter",
    },
    execLocalBin(context, "prisma", ["generate"], {
      description: "Generate Prisma Client into generated/prisma",
    }),
  ];
}

function postgresPlan(context: PlanContext) {
  return [
    addPackages(
      context,
      [
        npmPin("prisma", QUALIFIED_VERSIONS.prisma),
        npmPin("@types/pg", QUALIFIED_VERSIONS.typesPg),
      ],
      {
        description: "Install Prisma CLI and PostgreSQL types",
        dev: true,
        allowBuild: ["prisma", "@prisma/engines"],
      },
    ),
    addPackages(
      context,
      [
        npmPin("@prisma/client", QUALIFIED_VERSIONS.prismaClient),
        npmPin("@prisma/adapter-pg", QUALIFIED_VERSIONS.prismaAdapterPg),
        npmPin("pg", QUALIFIED_VERSIONS.pg),
        npmPin("dotenv", QUALIFIED_VERSIONS.dotenv),
      ],
      {
        description: "Install Prisma Client, the PostgreSQL adapter, and dotenv",
        allowBuild: ["esbuild"],
      },
    ),
    execLocalBin(
      context,
      "prisma",
      ["init", "--datasource-provider", "postgresql", "--output", "../generated/prisma"],
      { description: "Initialize Prisma with the PostgreSQL provider" },
    ),
    {
      type: "add_env_example" as const,
      path: ".env.example",
      entries: [
        {
          key: "DATABASE_URL",
          placeholder: "postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public",
        },
      ],
      description: "Document the Prisma PostgreSQL DATABASE_URL placeholder",
    },
    {
      type: "create_file" as const,
      path: "lib/prisma.ts",
      content: PRISMA_POSTGRES_CLIENT,
      behavior: "fail_if_exists" as const,
      description: "Add a Prisma Client helper that uses the PostgreSQL adapter",
    },
    execLocalBin(context, "prisma", ["generate"], {
      description: "Generate Prisma Client into generated/prisma",
    }),
  ];
}
