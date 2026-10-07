import {
  detectNpmPackage,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type InstallationOperation,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { requireNodeRange } from "./node-range.js";
import { NODE_ENGINE_RANGES, QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { dlx, usesTypescript } from "./scaffold.js";
import { mergeVerify, missingAnyFile } from "./verify.js";

export const shadcnIntegration = defineIntegration({
  id: "shadcn",
  name: "shadcn/ui",
  category: "ui",
  description: "Initializes shadcn/ui in an existing Next.js or Vite app.",
  status: "experimental",
  documentationUrl: "https://ui.shadcn.com/docs/cli",
  keywords: ["ui", "components", "radix"],
  verification: { verifiedAt: "2026-10-08" },
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "tailwind" },
      reason: "shadcn/ui is configured on top of Tailwind CSS.",
    },
  ],
  supports(context) {
    const node = supportsNodeNpmPnpm(context);
    if (!node.supported) {
      return node;
    }

    if (context.frameworkId !== "nextjs" && context.frameworkId !== "react-vite") {
      return {
        supported: false,
        reason: "This phase supports shadcn/ui with Next.js or React + Vite.",
      };
    }

    if (!context.integrationIds.includes("tailwind")) {
      return { supported: false, reason: "shadcn/ui requires Tailwind CSS." };
    }

    return { supported: true };
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "shadcn", ["components.json"]);
  },
  plan(context: PlanContext) {
    const template = context.config.framework.id === "react-vite" ? "vite" : "next";
    const viteAliases = template === "vite" ? viteAliasOperations(context) : [];
    return [
      ...viteAliases,
      requireNodeRange(NODE_ENGINE_RANGES.shadcn, `shadcn ${QUALIFIED_VERSIONS.shadcn}`),
      dlx(
        context,
        npmPin("shadcn", QUALIFIED_VERSIONS.shadcn),
        ["init", "--yes", "--defaults", "-t", template],
        {
          description: "Initialize shadcn/ui in the existing app",
        },
      ),
      {
        type: "verify",
        cwd: context.projectRoot,
        command: "node",
        args: [
          "-e",
          "const fs = require('node:fs'); if (!fs.existsSync('components.json')) { console.error('shadcn did not initialize components.json. Review the initialization output before retrying.'); process.exit(1); }",
        ],
        description: "Require shadcn initialization to produce components.json",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([await missingAnyFile(context, ["components.json"], "components.json")]);
  },
});

/** Alias paths are documented for existing Vite projects, not supplied by create-vite. */
function viteAliasOperations(context: PlanContext): InstallationOperation[] {
  const compilerOptions = { baseUrl: ".", paths: { "@/*": ["./src/*"] } };
  return [
    ...(usesTypescript(context)
      ? [
          {
            type: "modify_json" as const,
            path: "tsconfig.json",
            merge: { compilerOptions },
            behavior: "merge" as const,
            description: "Configure the root TypeScript shadcn alias",
          },
          {
            // create-vite's app tsconfig contains comments; preserve JSONC.
            type: "modify_text" as const,
            path: "tsconfig.app.json",
            oldText: '"compilerOptions": {',
            newText:
              '"compilerOptions": {\n    "baseUrl": ".",\n    "paths": { "@/*": ["./src/*"] },',
            description: "Configure the app TypeScript shadcn alias",
          },
        ]
      : [
          {
            type: "create_file" as const,
            path: "jsconfig.json",
            content: JSON.stringify({ compilerOptions }, null, 2) + "\n",
            behavior: "fail_if_exists" as const,
            description: "Configure the JavaScript shadcn alias",
          },
        ]),
    {
      type: "modify_text",
      path: usesTypescript(context) ? "vite.config.ts" : "vite.config.js",
      oldText: "import { defineConfig } from 'vite'",
      newText: "import { defineConfig } from 'vite'\nimport { fileURLToPath } from 'node:url'",
      description: "Resolve the Vite source alias on every supported platform",
    },
    {
      type: "modify_text",
      path: usesTypescript(context) ? "vite.config.ts" : "vite.config.js",
      oldText: "export default defineConfig({",
      newText:
        "export default defineConfig({\n  resolve: {\n    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },\n  },",
      description: "Enable the shadcn Vite source alias",
    },
  ];
}
