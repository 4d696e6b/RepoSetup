import type { SupportContext, SupportResult } from "@reposetup/core";

export function supportsNodeNpmPnpm(context: SupportContext): SupportResult {
  if (context.runtimeId !== "node") {
    return { supported: false, reason: "This phase supports Node.js only." };
  }

  if (context.packageManager !== "npm" && context.packageManager !== "pnpm") {
    return { supported: false, reason: "This phase supports npm and pnpm only." };
  }

  return { supported: true };
}

export const VITE_CONFIG_PATHS = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
] as const;
