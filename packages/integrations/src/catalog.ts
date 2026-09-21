import type { IntegrationDefinition } from "@reposetup/core";
import { createRegistry, type IntegrationRegistry } from "@reposetup/registry";

import { dockerComposeIntegration } from "./docker-compose.js";
import { dockerIntegration } from "./docker.js";
import { drizzleIntegration } from "./drizzle.js";
import { eslintIntegration } from "./eslint.js";
import { expressIntegration } from "./express.js";
import { fastifyIntegration } from "./fastify.js";
import { githubActionsIntegration } from "./github-actions.js";
import { mongodbIntegration } from "./mongodb.js";
import { mongooseIntegration } from "./mongoose.js";
import { nextjsIntegration } from "./nextjs.js";
import { nodeIntegration } from "./node.js";
import { npmIntegration } from "./npm.js";
import { playwrightIntegration } from "./playwright.js";
import { pnpmIntegration } from "./pnpm.js";
import { postgresqlIntegration } from "./postgresql.js";
import { prettierIntegration } from "./prettier.js";
import { prismaIntegration } from "./prisma.js";
import { reactViteIntegration } from "./react-vite.js";
import { shadcnIntegration } from "./shadcn.js";
import { sqliteIntegration } from "./sqlite.js";
import { tailwindIntegration } from "./tailwind.js";
import { vitestIntegration } from "./vitest.js";
import { zodIntegration } from "./zod.js";

export const builtInIntegrations: IntegrationDefinition[] = [
  nodeIntegration,
  npmIntegration,
  pnpmIntegration,
  nextjsIntegration,
  reactViteIntegration,
  expressIntegration,
  fastifyIntegration,
  tailwindIntegration,
  shadcnIntegration,
  sqliteIntegration,
  postgresqlIntegration,
  mongodbIntegration,
  prismaIntegration,
  drizzleIntegration,
  mongooseIntegration,
  zodIntegration,
  vitestIntegration,
  playwrightIntegration,
  eslintIntegration,
  prettierIntegration,
  dockerIntegration,
  dockerComposeIntegration,
  githubActionsIntegration,
];

export function createBuiltInRegistry(): IntegrationRegistry {
  return createRegistry(builtInIntegrations);
}
