import type { IntegrationDefinition } from "@reposetup/core";
import { createRegistry, type IntegrationRegistry } from "@reposetup/registry";

import { nextjsIntegration } from "./nextjs.js";
import { nodeIntegration } from "./node.js";
import { npmIntegration } from "./npm.js";
import { pnpmIntegration } from "./pnpm.js";
import { prettierIntegration } from "./prettier.js";
import { prismaIntegration } from "./prisma.js";
import { sqliteIntegration } from "./sqlite.js";
import { tailwindIntegration } from "./tailwind.js";
import { vitestIntegration } from "./vitest.js";
import { zodIntegration } from "./zod.js";

export const builtInIntegrations: IntegrationDefinition[] = [
  nodeIntegration,
  npmIntegration,
  pnpmIntegration,
  nextjsIntegration,
  tailwindIntegration,
  sqliteIntegration,
  prismaIntegration,
  zodIntegration,
  vitestIntegration,
  prettierIntegration,
];

export function createBuiltInRegistry(): IntegrationRegistry {
  return createRegistry(builtInIntegrations);
}
