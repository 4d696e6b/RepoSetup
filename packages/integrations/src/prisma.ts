import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, execLocalBin } from "./operations.js";

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
  plan(context) {
    return [
      addPackages(context, ["prisma", "@types/better-sqlite3"], {
        description: "Install Prisma CLI and better-sqlite3 types",
        dev: true,
      }),
      addPackages(context, ["@prisma/client", "@prisma/adapter-better-sqlite3", "dotenv"], {
        description: "Install Prisma Client, the SQLite adapter, and dotenv",
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
    ];
  },
});
