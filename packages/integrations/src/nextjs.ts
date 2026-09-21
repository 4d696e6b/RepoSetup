import * as z from "zod";

import type { InstallationOperation, PlanContext, SupportContext } from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";

const nextjsOptionsSchema = z.strictObject({
  typescript: z.boolean().optional(),
});

type NextjsOptions = z.infer<typeof nextjsOptionsSchema>;

export const nextjsIntegration = defineIntegration<NextjsOptions>({
  id: "nextjs",
  name: "Next.js",
  category: "framework",
  description: "Scaffolds a Next.js App Router project with create-next-app.",
  status: "experimental",
  documentationUrl: "https://nextjs.org/docs/app/getting-started/installation",
  keywords: ["react", "app-router", "vercel"],
  optionSchema: nextjsOptionsSchema,
  verification: {
    verifiedAt: VERIFIED_AT,
    runtimeRange: ">=20.9",
  },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "create-next-app requires Node.js.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "package-manager" },
      reason: "create-next-app is bootstrapped with npm or pnpm.",
    },
  ],
  supports(context: SupportContext) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "Next.js requires the Node.js runtime." };
    }

    if (context.packageManager !== "npm" && context.packageManager !== "pnpm") {
      return { supported: false, reason: "This phase supports npm and pnpm only." };
    }

    return { supported: true };
  },
  plan(context: PlanContext<NextjsOptions>) {
    const directory = context.projectRoot;
    const typescript = context.options.typescript !== false;
    const flags = [
      typescript ? "--ts" : "--js",
      "--eslint",
      "--app",
      // --yes can reuse a saved src/ preference. Official Tailwind/Vitest paths use app/.
      "--no-src-dir",
      // Tailwind v4 is owned by the Tailwind integration, not create-next-app.
      "--no-tailwind",
      "--import-alias",
      "@/*",
      context.config.packageManager === "pnpm" ? "--use-pnpm" : "--use-npm",
      "--yes",
    ];

    const operation: InstallationOperation =
      context.config.packageManager === "pnpm"
        ? {
            type: "run_command",
            command: "pnpm",
            args: ["create", "next-app@latest", directory, ...flags],
            cwd: ".",
            description: "Scaffold Next.js with create-next-app",
            requiresNetwork: true,
            longRunning: true,
          }
        : {
            type: "run_command",
            command: "npx",
            args: ["create-next-app@latest", directory, ...flags],
            cwd: ".",
            description: "Scaffold Next.js with create-next-app",
            requiresNetwork: true,
            longRunning: true,
          };

    return [operation];
  },
});
