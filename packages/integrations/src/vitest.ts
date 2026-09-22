import { detectNpmPackage, type DetectionContext, type DetectionResult } from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, execLocalBin } from "./operations.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const VITEST_CONFIG_TS = `import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
  },
})
`;

const VITEST_CONFIG_JS = `import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
`;

const VITEST_CONFIG_PATHS = [
  "vitest.config.mts",
  "vitest.config.ts",
  "vitest.config.js",
  "vitest.config.mjs",
] as const;

export const vitestIntegration = defineIntegration({
  id: "vitest",
  name: "Vitest",
  category: "testing",
  description:
    "Adds Vitest. Next.js uses the official RTL guide; other Node apps install Vitest only.",
  status: "candidate",
  documentationUrl: "https://vitest.dev/guide/",
  keywords: ["test", "vite", "rtl"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Vitest is added to the scaffolded application.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "Vitest requires Node.js." };
    }

    const allowed = new Set(["nextjs", "react-vite", "express", "fastify"]);
    if (!allowed.has(context.frameworkId)) {
      return {
        supported: false,
        reason: "This phase supports Vitest with Next.js, React + Vite, Express, or Fastify.",
      };
    }

    return { supported: true };
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "vitest", VITEST_CONFIG_PATHS);
  },
  plan(context) {
    if (context.config.framework.id !== "nextjs") {
      const typescript = context.config.framework.options?.typescript !== false;
      return [
        addPackages(context, ["vitest"], {
          description: "Install Vitest",
          dev: true,
        }),
        {
          type: "create_file",
          path: typescript ? "vitest.config.ts" : "vitest.config.js",
          content: `import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({})\n`,
          behavior: "fail_if_exists",
          description: "Add a Vitest config so doctor can find it",
        },
        {
          type: "modify_json",
          path: "package.json",
          merge: { scripts: { test: "vitest" } },
          behavior: "merge",
          description: "Add the official Vitest test script",
        },
      ];
    }

    const typescript = context.config.framework.options?.typescript !== false;
    const packages = typescript
      ? [
          "vitest",
          "@vitejs/plugin-react",
          "jsdom",
          "@testing-library/react",
          "@testing-library/dom",
          "vite-tsconfig-paths",
        ]
      : [
          "vitest",
          "@vitejs/plugin-react",
          "jsdom",
          "@testing-library/react",
          "@testing-library/dom",
        ];

    return [
      addPackages(context, packages, {
        description: "Install Vitest and the official Next.js test packages",
        dev: true,
        allowBuild: ["esbuild"],
      }),
      {
        type: "create_file",
        path: typescript ? "vitest.config.mts" : "vitest.config.js",
        content: typescript ? VITEST_CONFIG_TS : VITEST_CONFIG_JS,
        behavior: "fail_if_exists",
        description: "Add the official Next.js Vitest config",
      },
      {
        type: "modify_json",
        path: "package.json",
        merge: { scripts: { test: "vitest" } },
        behavior: "merge",
        description: "Add the test script from the Next.js Vitest guide",
      },
      execLocalBin(context, "vitest", ["run", "--passWithNoTests"], {
        description: "Load the Vitest config with no project tests yet",
      }),
    ];
  },
  async verify(context) {
    return mergeVerify([
      missingPackage(context, "vitest"),
      await missingAnyFile(
        context,
        VITEST_CONFIG_PATHS,
        "a Vitest config (vitest.config.mts, vitest.config.ts, vitest.config.js, or vitest.config.mjs)",
      ),
    ]);
  },
});
