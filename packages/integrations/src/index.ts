export const packageName = "@reposetup/integrations" as const;

export { builtInIntegrations, createBuiltInRegistry } from "./catalog.js";
export { nextjsIntegration } from "./nextjs.js";
export { nodeIntegration } from "./node.js";
export { npmIntegration } from "./npm.js";
export { pnpmIntegration } from "./pnpm.js";
export { prettierIntegration } from "./prettier.js";
export { prismaIntegration } from "./prisma.js";
export { sqliteIntegration } from "./sqlite.js";
export { tailwindIntegration } from "./tailwind.js";
export { vitestIntegration } from "./vitest.js";
export { zodIntegration } from "./zod.js";
