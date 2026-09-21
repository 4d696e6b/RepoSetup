import { detectNpmPackage, type DetectionContext, type DetectionResult } from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, execLocalBin } from "./operations.js";

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

export const vitestIntegration = defineIntegration({
  id: "vitest",
  name: "Vitest",
  category: "testing",
  description: "Adds Vitest and React Testing Library to a Next.js app.",
  status: "experimental",
  documentationUrl: "https://nextjs.org/docs/app/guides/testing/vitest",
  keywords: ["test", "vite", "rtl"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "nextjs" },
      reason: "This phase implements the official Next.js Vitest guide.",
    },
  ],
  supports(context) {
    if (context.frameworkId !== "nextjs") {
      return { supported: false, reason: "This phase supports Vitest with Next.js only." };
    }

    if (context.runtimeId !== "node") {
      return { supported: false, reason: "Vitest for Next.js requires Node.js." };
    }

    return { supported: true };
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "vitest", [
      "vitest.config.mts",
      "vitest.config.ts",
      "vitest.config.js",
      "vitest.config.mjs",
    ]);
  },
  plan(context) {
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
});
