import {
  detectNpmPackage,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { addPackages } from "./operations.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const ESLINT_CONFIG_PATHS = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
  "eslint.config.cjs",
] as const;

const ESLINT_CONFIG = `import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
  {
    files: ["**/*.js"],
    plugins: {
      js,
    },
    extends: ["js/recommended"],
  },
]);
`;

export const eslintIntegration = defineIntegration({
  id: "eslint",
  name: "ESLint",
  category: "linting",
  description: "Adds ESLint with the official flat config recommended rules.",
  status: "candidate",
  documentationUrl: "https://eslint.org/docs/latest/use/getting-started",
  keywords: ["lint", "quality"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "ESLint is added to the scaffolded application.",
    },
  ],
  supports(context) {
    return supportsNodeNpmPnpm(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "eslint", ESLINT_CONFIG_PATHS);
  },
  plan(context: PlanContext) {
    return [
      addPackages(context, ["eslint@latest", "@eslint/js@latest"], {
        description: "Install ESLint and @eslint/js",
        dev: true,
      }),
      {
        type: "create_file",
        path: "eslint.config.js",
        content: ESLINT_CONFIG,
        behavior: "create_if_missing",
        description: "Add the official ESLint recommended flat config if none exists",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "eslint"),
      await missingAnyFile(context, ESLINT_CONFIG_PATHS, "an ESLint flat config"),
    ]);
  },
});
