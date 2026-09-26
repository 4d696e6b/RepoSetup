import {
  detectNpmPackage,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { requireNodeRange } from "./node-range.js";
import { addPackages, execLocalBin } from "./operations.js";
import { NODE_ENGINE_RANGES, QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";
import { usesTypescript } from "./scaffold.js";

const ESLINT_CONFIG_PATHS = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
  "eslint.config.cjs",
] as const;

const ESLINT_CONFIG_JS = `// @ts-check
import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
  {
    ignores: ["dist/**", ".next/**", "generated/**", "coverage/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    extends: [js.configs.recommended],
  },
]);
`;

const ESLINT_CONFIG_TS = `// @ts-check
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["dist/**", ".next/**", "generated/**", "coverage/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
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
    const typescript = usesTypescript(context);
    const packages = [
      npmPin("eslint", QUALIFIED_VERSIONS.eslint),
      npmPin("@eslint/js", QUALIFIED_VERSIONS.eslintJs),
      ...(typescript ? [npmPin("typescript-eslint", QUALIFIED_VERSIONS.typescriptEslint)] : []),
    ];
    return [
      requireNodeRange(NODE_ENGINE_RANGES.eslint, `ESLint ${QUALIFIED_VERSIONS.eslint}`),
      addPackages(context, packages, {
        description: typescript
          ? "Install ESLint, @eslint/js, and TypeScript ESLint"
          : "Install ESLint and @eslint/js",
        dev: true,
      }),
      {
        type: "create_file",
        path: "eslint.config.mjs",
        content: typescript ? ESLINT_CONFIG_TS : ESLINT_CONFIG_JS,
        behavior: "create_if_missing",
        description: "Add the official ESLint recommended flat config if none exists",
      },
      {
        type: "modify_json",
        path: "package.json",
        merge: { scripts: { lint: "eslint ." } },
        behavior: "merge",
        description: "Add the ESLint script",
      },
      execLocalBin(context, "eslint", ["."], {
        description: "Lint the generated project",
      }),
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "eslint"),
      await missingAnyFile(context, ESLINT_CONFIG_PATHS, "an ESLint flat config"),
    ]);
  },
});
