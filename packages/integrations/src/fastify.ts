import * as z from "zod";

import {
  detectNpmPackage,
  type DetectionContext,
  type DetectionResult,
  type InstallationOperation,
  type PlanContext,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { APP_FRAMEWORK_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { addPackages, hasSelectedIntegration } from "./operations.js";
import { QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { createNodePackageJson, usesTypescript } from "./scaffold.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const fastifyOptionsSchema = z.strictObject({
  typescript: z.boolean().optional(),
});

type FastifyOptions = z.infer<typeof fastifyOptionsSchema>;

const FASTIFY_TSCONFIG = `{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "skipLibCheck": true
  }
}
`;

const FASTIFY_SERVER_TS = `import Fastify from "fastify";

export const app = Fastify({ logger: false });

app.get("/", function () {
  return { hello: "world" };
});

if (process.env.REPOSETUP_NO_LISTEN !== "1") {
  app.listen({ port: Number(process.env.PORT ?? "3000"), host: "127.0.0.1" }, (error) => {
    if (error) {
      app.log.error(error);
      process.exit(1);
    }
  });
}
`;

const FASTIFY_ENDPOINT_TEST = `import { beforeAll, expect, it } from "vitest";

beforeAll(() => {
  process.env.REPOSETUP_NO_LISTEN = "1";
});

it("returns the hello world response", async () => {
  const { app } = await import("./server.js");
  const response = await app.inject({ method: "GET", url: "/" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ hello: "world" });
});
`;

const FASTIFY_SERVER_JS = `import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})

fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
`;

export const fastifyIntegration = defineIntegration<FastifyOptions>({
  id: "fastify",
  name: "Fastify",
  category: "backend-framework",
  description: "Adds Fastify with the official first-server ESM example.",
  status: "experimental",
  documentationUrl: "https://fastify.dev/docs/latest/Guides/Getting-Started/",
  keywords: ["api", "http", "server"],
  optionSchema: fastifyOptionsSchema,
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "Fastify requires Node.js.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "package-manager" },
      reason: "Fastify is installed with npm or pnpm.",
    },
  ],
  conflicts: APP_FRAMEWORK_CONFLICTS,
  supports(context: SupportContext) {
    return supportsNodeNpmPnpm(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "fastify");
  },
  plan(context: PlanContext<FastifyOptions>) {
    const typescript = usesTypescript(context);
    const entry = typescript ? "src/server.ts" : "server.js";
    const operations: InstallationOperation[] = [
      createNodePackageJson(context),
      addPackages(context, [npmPin("fastify", QUALIFIED_VERSIONS.fastify)], {
        description: "Install Fastify",
      }),
    ];

    if (typescript) {
      operations.push(
        addPackages(
          context,
          [
            npmPin("typescript", QUALIFIED_VERSIONS.typescript),
            npmPin("@types/node", QUALIFIED_VERSIONS.typesNode),
            npmPin("tsx", QUALIFIED_VERSIONS.tsx),
          ],
          {
            description: "Install TypeScript and tsx for the Fastify server",
            dev: true,
            allowBuild: ["esbuild"],
          },
        ),
        {
          type: "create_file",
          path: "tsconfig.json",
          content: FASTIFY_TSCONFIG,
          behavior: "fail_if_exists",
          description: "Add TypeScript compiler options for the Fastify server",
        },
        {
          type: "create_directory",
          path: "src",
          behavior: "create_if_missing",
          description: "Create src for the Fastify TypeScript entry",
        },
        {
          type: "create_file",
          path: entry,
          content: FASTIFY_SERVER_TS,
          behavior: "fail_if_exists",
          description: "Add a typed Fastify server",
        },
        {
          type: "modify_json",
          path: "package.json",
          merge: {
            scripts: {
              dev: "tsx watch src/server.ts",
              build: "tsc --outDir dist",
              start: "node dist/server.js",
            },
          },
          behavior: "merge",
          description: "Add Fastify development, build, and start scripts",
        },
      );
      if (hasSelectedIntegration(context, "vitest")) {
        operations.push({
          type: "create_file",
          path: "src/server.test.ts",
          content: FASTIFY_ENDPOINT_TEST,
          behavior: "fail_if_exists",
          description: "Add a Fastify response test",
        });
      }
      return operations;
    }

    operations.push({
      type: "create_file",
      path: entry,
      content: FASTIFY_SERVER_JS,
      behavior: "fail_if_exists",
      description: "Add the official Fastify ESM first server",
    });

    return operations;
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "fastify"),
      await missingAnyFile(
        context,
        ["src/server.ts", "server.js", "server.ts"],
        "a Fastify server entry file",
      ),
    ]);
  },
});
