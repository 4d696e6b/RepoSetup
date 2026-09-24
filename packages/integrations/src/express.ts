import * as z from "zod";

import {
  type DetectionContext,
  type DetectionResult,
  type InstallationOperation,
  type PlanContext,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
  detectNpmPackage,
} from "@reposetup/core";

import { APP_FRAMEWORK_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { addPackages } from "./operations.js";
import { QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { createNodePackageJson, usesTypescript } from "./scaffold.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const expressOptionsSchema = z.strictObject({
  typescript: z.boolean().optional(),
});

type ExpressOptions = z.infer<typeof expressOptionsSchema>;

const EXPRESS_TSCONFIG = `{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  }
}
`;

const EXPRESS_APP_TS = `import express, { type Express, type Request, type Response } from 'express';

const app: Express = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.listen(3000);
`;

const EXPRESS_README = `# Express app

Run the JavaScript entry with:

\`node app.js\`

For the TypeScript entry, compile with your TypeScript toolchain before starting the output.
`;

const EXPRESS_APP_JS = `import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000);
`;

export const expressIntegration = defineIntegration<ExpressOptions>({
  id: "express",
  name: "Express",
  category: "backend-framework",
  description: "Adds Express 5 with the official Hello World server.",
  status: "candidate",
  documentationUrl: "https://expressjs.com/en/5x/starter/installing/",
  keywords: ["api", "http", "server"],
  optionSchema: expressOptionsSchema,
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "Express requires Node.js 18 or later.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "package-manager" },
      reason: "Express is installed with npm or pnpm.",
    },
  ],
  conflicts: APP_FRAMEWORK_CONFLICTS,
  supports(context: SupportContext) {
    return supportsNodeNpmPnpm(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "express");
  },
  plan(context: PlanContext<ExpressOptions>) {
    const typescript = usesTypescript(context);
    const operations: InstallationOperation[] = [
      createNodePackageJson(context),
      addPackages(context, [npmPin("express", QUALIFIED_VERSIONS.express)], {
        description: "Install Express",
      }),
    ];

    if (typescript) {
      operations.push(
        addPackages(
          context,
          [
            npmPin("typescript", QUALIFIED_VERSIONS.typescript),
            npmPin("@types/express", QUALIFIED_VERSIONS.typesExpress),
            npmPin("@types/node", QUALIFIED_VERSIONS.typesNode),
          ],
          {
            description: "Install TypeScript and Express type packages",
            dev: true,
          },
        ),
        {
          type: "create_file",
          path: "tsconfig.json",
          content: EXPRESS_TSCONFIG,
          behavior: "fail_if_exists",
          description: "Add the official Express TypeScript compiler options",
        },
        {
          type: "create_directory",
          path: "src",
          behavior: "create_if_missing",
          description: "Create src for the Express TypeScript entry",
        },
        {
          type: "create_file",
          path: "src/app.ts",
          content: EXPRESS_APP_TS,
          behavior: "fail_if_exists",
          description: "Add the official Express TypeScript Hello World server",
        },
      );
    } else {
      operations.push({
        type: "create_file",
        path: "app.js",
        content: EXPRESS_APP_JS,
        behavior: "fail_if_exists",
        description: "Add an ESM Express Hello World server",
      });
    }

    operations.push({
      type: "create_file",
      path: "README.md",
      content: EXPRESS_README,
      behavior: "fail_if_exists",
      description: "Add Express run instructions",
    });

    return operations;
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "express"),
      await missingAnyFile(context, ["src/app.ts", "app.js", "app.ts"], "an Express entry file"),
    ]);
  },
});
