import * as z from "zod";

import {
  detectedResult,
  evidence,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type InstallationOperation,
  type PlanContext,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { APP_FRAMEWORK_CONFLICTS } from "./conflicts.js";
import { defineIntegration, VERIFIED_AT } from "./define.js";
import { firstExistingPath } from "./first-existing.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const NEXT_CONFIG_PATHS = [
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "next.config.mts",
] as const;

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
  conflicts: APP_FRAMEWORK_CONFLICTS,
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
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const pkg = context.packageJson;
    const hasNext = pkg !== undefined && hasPackageDependency(pkg, "next");
    const config = await firstExistingPath(context.files, NEXT_CONFIG_PATHS);
    const appDir = await firstExistingPath(context.files, ["app", "src/app", "pages", "src/pages"]);

    if (!hasNext && config === undefined && appDir === undefined) {
      return notDetected();
    }

    const items = [];
    if (hasNext) {
      items.push(evidence("dependency", "package.json includes next", "package.json"));
    }
    if (config !== undefined) {
      items.push(evidence("config", `Found ${config}`, config));
    }
    if (appDir !== undefined) {
      items.push(evidence("directory", `Found ${appDir}`, appDir));
    }

    const confidence = hasNext ? "certain" : config !== undefined ? "likely" : "possible";
    return detectedResult(confidence, items);
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
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "next"),
      await missingAnyFile(
        context,
        NEXT_CONFIG_PATHS,
        "a Next.js config (next.config.ts, next.config.mjs, next.config.js, or next.config.mts)",
      ),
    ]);
  },
});
