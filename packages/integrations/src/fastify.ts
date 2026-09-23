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
import { addPackages } from "./operations.js";
import { QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { createNodePackageJson, usesTypescript } from "./scaffold.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const fastifyOptionsSchema = z.strictObject({
  typescript: z.boolean().optional(),
});

type FastifyOptions = z.infer<typeof fastifyOptionsSchema>;

const FASTIFY_SERVER = `import Fastify from 'fastify'

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
      operations.push({
        type: "create_directory",
        path: "src",
        behavior: "create_if_missing",
        description: "Create src for the Fastify TypeScript entry",
      });
    }

    operations.push({
      type: "create_file",
      path: entry,
      content: FASTIFY_SERVER,
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
