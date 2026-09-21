import {
  detectedResult,
  evidence,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, execLocalBin } from "./operations.js";
import { failVerify, mergeVerify, missingAnyFile, missingEnvKeys } from "./verify.js";

const PRISMA_CLIENT = `import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = \`\${process.env.DATABASE_URL}\`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
`;

export const prismaIntegration = defineIntegration({
  id: "prisma",
  name: "Prisma",
  category: "orm",
  description: "Adds Prisma ORM with the SQLite driver adapter.",
  status: "experimental",
  documentationUrl: "https://www.prisma.io/docs/v7/prisma-orm/add-to-existing-project/sqlite",
  keywords: ["orm", "sqlite", "migrate"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "database" },
      reason: "Prisma needs a selected database. This phase implements SQLite.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Prisma is added to the scaffolded application.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase supports Prisma with Node.js only." };
    }

    if (context.packageManager !== "npm" && context.packageManager !== "pnpm") {
      return { supported: false, reason: "This phase supports npm and pnpm only." };
    }

    if (!context.integrationIds.includes("sqlite")) {
      return { supported: false, reason: "This phase implements Prisma with SQLite only." };
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
    // Official SQLite guide: prisma@prev + @prisma/client@7. Unpinned prisma currently
    // resolves to 8 RC, whose init CLI dropped --datasource-provider.
    return [
      addPackages(context, ["prisma@prev", "@types/better-sqlite3"], {
        description: "Install Prisma CLI and better-sqlite3 types",
        dev: true,
        allowBuild: ["prisma", "@prisma/engines"],
      }),
      addPackages(context, ["@prisma/client@7", "@prisma/adapter-better-sqlite3", "dotenv"], {
        description: "Install Prisma Client, the SQLite adapter, and dotenv",
        allowBuild: ["esbuild", "!better-sqlite3"],
      }),
      execLocalBin(
        context,
        "prisma",
        ["init", "--datasource-provider", "sqlite", "--output", "../generated/prisma"],
        { description: "Initialize Prisma with the SQLite provider" },
      ),
      {
        type: "add_env_example",
        path: ".env.example",
        entries: [{ key: "DATABASE_URL", placeholder: "file:./dev.db" }],
        description: "Document the SQLite DATABASE_URL placeholder",
      },
      {
        type: "create_file",
        path: "lib/prisma.ts",
        content: PRISMA_CLIENT,
        behavior: "fail_if_exists",
        description: "Add a Prisma Client helper that uses the SQLite adapter",
      },
      execLocalBin(context, "prisma", ["generate"], {
        description: "Generate Prisma Client into generated/prisma",
      }),
    ];
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
      await missingEnvKeys(context, ".env.example", ["DATABASE_URL"]),
    ]);
  },
});
