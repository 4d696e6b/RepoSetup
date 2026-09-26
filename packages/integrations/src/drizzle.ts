import {
  detectNpmPackage,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { ORM_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { addPackages, hasSelectedIntegration } from "./operations.js";
import { QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { mergeVerify, missingAnyFile, missingEnvKeys, missingPackage } from "./verify.js";

const DRIZZLE_CONFIG = `import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (url === undefined) {
  throw new Error("DATABASE_URL is required");
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
});
`;

const DRIZZLE_CLIENT = `import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined) {
  throw new Error("DATABASE_URL is required");
}

export const db = drizzle(connectionString);
`;

const DRIZZLE_SCHEMA_TEST = `import { getTableName } from "drizzle-orm";
import { expect, it } from "vitest";

import { items } from "./schema.js";

it("names the generated items table", () => {
  expect(getTableName(items)).toBe("items");
});
`;

const DRIZZLE_SCHEMA = `import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});
`;

export const drizzleIntegration = defineIntegration({
  id: "drizzle",
  name: "Drizzle ORM",
  category: "orm",
  description: "Adds Drizzle ORM with the official node-postgres PostgreSQL path.",
  status: "experimental",
  documentationUrl: "https://orm.drizzle.team/docs/get-started/postgresql-new",
  keywords: ["orm", "sql", "postgres"],
  verification: { verifiedAt: "2026-09-22" },
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "postgresql" },
      reason: "This phase implements Drizzle with PostgreSQL (node-postgres) only.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Drizzle is added to the scaffolded application.",
    },
  ],
  conflicts: ORM_CONFLICTS,
  supports(context) {
    const node = supportsNodeNpmPnpm(context);
    if (!node.supported) {
      return node;
    }

    if (!context.integrationIds.includes("postgresql")) {
      return {
        supported: false,
        reason: "This phase supports Drizzle with PostgreSQL only.",
      };
    }

    return { supported: true };
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "drizzle-orm", ["drizzle.config.ts", "drizzle.config.js"]);
  },
  plan(context: PlanContext) {
    if (!hasSelectedIntegration(context, "postgresql")) {
      return [];
    }

    return [
      addPackages(
        context,
        [
          npmPin("drizzle-orm", QUALIFIED_VERSIONS.drizzleOrm),
          npmPin("pg", QUALIFIED_VERSIONS.pg),
          npmPin("dotenv", QUALIFIED_VERSIONS.dotenv),
        ],
        {
          description: "Install Drizzle ORM, node-postgres, and dotenv",
        },
      ),
      addPackages(
        context,
        [
          npmPin("drizzle-kit", QUALIFIED_VERSIONS.drizzleKit),
          npmPin("tsx", QUALIFIED_VERSIONS.tsx),
          npmPin("@types/pg", QUALIFIED_VERSIONS.typesPg),
        ],
        {
          description: "Install Drizzle Kit and PostgreSQL types",
          dev: true,
        },
      ),
      {
        type: "create_directory",
        path: "src/db",
        behavior: "create_if_missing",
        description: "Create the Drizzle schema directory",
      },
      {
        type: "create_file",
        path: "drizzle.config.ts",
        content: DRIZZLE_CONFIG,
        behavior: "fail_if_exists",
        description: "Add the official Drizzle Kit PostgreSQL config",
      },
      {
        type: "create_file",
        path: "src/db/schema.ts",
        content: DRIZZLE_SCHEMA,
        behavior: "fail_if_exists",
        description: "Add a starter Drizzle PostgreSQL schema",
      },
      {
        type: "create_file",
        path: "src/db/index.ts",
        content: DRIZZLE_CLIENT,
        behavior: "fail_if_exists",
        description: "Add the official Drizzle node-postgres client",
      },
      ...(hasSelectedIntegration(context, "vitest")
        ? [
            {
              type: "create_file" as const,
              path: "src/db/schema.test.ts",
              content: DRIZZLE_SCHEMA_TEST,
              behavior: "fail_if_exists" as const,
              description: "Add a Drizzle schema assertion that does not connect to PostgreSQL",
            },
          ]
        : []),
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "drizzle-orm"),
      await missingAnyFile(
        context,
        ["drizzle.config.ts", "drizzle.config.js"],
        "drizzle.config.ts",
      ),
      await missingEnvKeys(context, ".env.example", ["DATABASE_URL"]),
    ]);
  },
});
