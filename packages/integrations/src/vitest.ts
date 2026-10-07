import { detectNpmPackage, type DetectionContext, type DetectionResult } from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { requireNodeRange } from "./node-range.js";
import { addPackages, execLocalBin } from "./operations.js";
import { NODE_ENGINE_RANGES, QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
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

const REACT_SAMPLE_TS = `export function sampleMessage(): string {
  return 'Hello from RepoSetup'
}
`;

const REACT_SAMPLE_TEST_TS = `import { expect, it } from 'vitest'

import { sampleMessage } from './sample'

it('returns the generated React sample message', () => {
  expect(sampleMessage()).toBe('Hello from RepoSetup')
})
`;

const REACT_SAMPLE_JS = `export function sampleMessage() {
  return 'Hello from RepoSetup'
}
`;

const REACT_SAMPLE_TEST_JS = `import { expect, it } from 'vitest'

import { sampleMessage } from './sample.js'

it('returns the generated React sample message', () => {
  expect(sampleMessage()).toBe('Hello from RepoSetup')
})
`;

const NEXT_HEALTH_ROUTE_TS = `export function GET(): Response {
  return Response.json({ ok: true });
}
`;

const NEXT_HEALTH_ROUTE_JS = `export function GET() {
  return Response.json({ ok: true });
}
`;

const NEXT_HEALTH_TEST_TS = `import { expect, it } from "vitest";

import { GET } from "./app/api/health/route";

it("returns the generated Next.js health response", async () => {
  const response = GET();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true });
});
`;

const NEXT_HEALTH_TEST_JS = `import { expect, it } from "vitest";

import { GET } from "./app/api/health/route.js";

it("returns the generated Next.js health response", async () => {
  const response = GET();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true });
});
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
      const reactSample =
        context.config.framework.id === "react-vite"
          ? [
              {
                type: "create_file" as const,
                path: typescript ? "src/sample.ts" : "src/sample.js",
                content: typescript ? REACT_SAMPLE_TS : REACT_SAMPLE_JS,
                behavior: "fail_if_exists" as const,
                description: "Add a React sample module",
              },
              {
                type: "create_file" as const,
                path: typescript ? "src/sample.test.ts" : "src/sample.test.js",
                content: typescript ? REACT_SAMPLE_TEST_TS : REACT_SAMPLE_TEST_JS,
                behavior: "fail_if_exists" as const,
                description: "Add a React sample assertion",
              },
            ]
          : [];
      return [
        requireNodeRange(NODE_ENGINE_RANGES.vitest, `Vitest ${QUALIFIED_VERSIONS.vitest}`),
        addPackages(context, [npmPin("vitest", QUALIFIED_VERSIONS.vitest)], {
          description: "Install Vitest",
          dev: true,
          allowBuild: ["esbuild"],
        }),
        {
          type: "create_file",
          path: typescript ? "vitest.config.ts" : "vitest.config.js",
          content: `import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({})\n`,
          behavior: "fail_if_exists",
          description: "Add a Vitest config so doctor can find it",
        },
        ...reactSample,
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
          npmPin("vitest", QUALIFIED_VERSIONS.vitest),
          npmPin("@vitejs/plugin-react", QUALIFIED_VERSIONS.vitePluginReact),
          npmPin("jsdom", QUALIFIED_VERSIONS.jsdom),
          npmPin("@testing-library/react", QUALIFIED_VERSIONS.testingLibraryReact),
          npmPin("@testing-library/dom", QUALIFIED_VERSIONS.testingLibraryDom),
          npmPin("vite-tsconfig-paths", QUALIFIED_VERSIONS.viteTsconfigPaths),
        ]
      : [
          npmPin("vitest", QUALIFIED_VERSIONS.vitest),
          npmPin("@vitejs/plugin-react", QUALIFIED_VERSIONS.vitePluginReact),
          npmPin("jsdom", QUALIFIED_VERSIONS.jsdom),
          npmPin("@testing-library/react", QUALIFIED_VERSIONS.testingLibraryReact),
          npmPin("@testing-library/dom", QUALIFIED_VERSIONS.testingLibraryDom),
        ];

    return [
      requireNodeRange(NODE_ENGINE_RANGES.vitest, `Vitest ${QUALIFIED_VERSIONS.vitest}`),
      requireNodeRange(NODE_ENGINE_RANGES.jsdom, `jsdom ${QUALIFIED_VERSIONS.jsdom}`),
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
        type: "create_file",
        path: typescript ? "app/api/health/route.ts" : "app/api/health/route.js",
        content: typescript ? NEXT_HEALTH_ROUTE_TS : NEXT_HEALTH_ROUTE_JS,
        behavior: "fail_if_exists",
        description: "Add a Next.js health response",
      },
      {
        type: "create_file",
        path: typescript ? "health.test.ts" : "health.test.js",
        content: typescript ? NEXT_HEALTH_TEST_TS : NEXT_HEALTH_TEST_JS,
        behavior: "fail_if_exists",
        description: "Add a Next.js health response assertion",
      },
      {
        type: "modify_json",
        path: "package.json",
        merge: { scripts: { test: "vitest" } },
        behavior: "merge",
        description: "Add the test script from the Next.js Vitest guide",
      },
      execLocalBin(context, "vitest", ["run"], {
        description: "Run the generated Next.js sample assertion",
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
