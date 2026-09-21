import type { IntegrationDefinition } from "@reposetup/core";
import { createRegistry, type IntegrationRegistry } from "@reposetup/registry";

import { alembicIntegration } from "./alembic.js";
import { dockerComposeIntegration } from "./docker-compose.js";
import { dockerIntegration } from "./docker.js";
import { drizzleIntegration } from "./drizzle.js";
import { eslintIntegration } from "./eslint.js";
import { expressIntegration } from "./express.js";
import { fastapiIntegration } from "./fastapi.js";
import { fastifyIntegration } from "./fastify.js";
import { flaskIntegration } from "./flask.js";
import { githubActionsIntegration } from "./github-actions.js";
import { mongodbIntegration } from "./mongodb.js";
import { mongooseIntegration } from "./mongoose.js";
import { nextjsIntegration } from "./nextjs.js";
import { nodeIntegration } from "./node.js";
import { npmIntegration } from "./npm.js";
import { pipIntegration } from "./pip.js";
import { playwrightIntegration } from "./playwright.js";
import { pnpmIntegration } from "./pnpm.js";
import { postgresqlIntegration } from "./postgresql.js";
import { prettierIntegration } from "./prettier.js";
import { prismaIntegration } from "./prisma.js";
import { pydanticIntegration } from "./pydantic.js";
import { pytestIntegration } from "./pytest.js";
import { pythonIntegration } from "./python.js";
import { reactViteIntegration } from "./react-vite.js";
import { ruffIntegration } from "./ruff.js";
import { shadcnIntegration } from "./shadcn.js";
import { sqlalchemyIntegration } from "./sqlalchemy.js";
import { sqliteIntegration } from "./sqlite.js";
import { tailwindIntegration } from "./tailwind.js";
import { uvIntegration } from "./uv.js";
import { vitestIntegration } from "./vitest.js";
import { zodIntegration } from "./zod.js";

export const builtInIntegrations: IntegrationDefinition[] = [
  nodeIntegration,
  pythonIntegration,
  npmIntegration,
  pnpmIntegration,
  uvIntegration,
  pipIntegration,
  nextjsIntegration,
  reactViteIntegration,
  expressIntegration,
  fastifyIntegration,
  fastapiIntegration,
  flaskIntegration,
  tailwindIntegration,
  shadcnIntegration,
  sqliteIntegration,
  postgresqlIntegration,
  mongodbIntegration,
  prismaIntegration,
  drizzleIntegration,
  mongooseIntegration,
  sqlalchemyIntegration,
  alembicIntegration,
  zodIntegration,
  pydanticIntegration,
  vitestIntegration,
  playwrightIntegration,
  pytestIntegration,
  eslintIntegration,
  prettierIntegration,
  ruffIntegration,
  dockerIntegration,
  dockerComposeIntegration,
  githubActionsIntegration,
];

export function createBuiltInRegistry(): IntegrationRegistry {
  return createRegistry(builtInIntegrations);
}
