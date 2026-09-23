import {
  detectNpmPackage,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { ORM_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { addPackages } from "./operations.js";
import { QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { mergeVerify, missingAnyFile, missingEnvKeys, missingPackage } from "./verify.js";

const MONGOOSE_CLIENT = `import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (uri === undefined || uri.length === 0) {
    throw new Error('MONGODB_URI is not set.');
  }

  await mongoose.connect(uri);
}

export { mongoose };
`;

export const mongooseIntegration = defineIntegration({
  id: "mongoose",
  name: "Mongoose",
  category: "orm",
  description: "Adds Mongoose with the official MongoDB connection helper.",
  status: "experimental",
  documentationUrl: "https://mongoosejs.com/docs/index.html",
  keywords: ["orm", "mongo", "odm"],
  verification: { verifiedAt: "2026-09-22" },
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "mongodb" },
      reason: "Mongoose connects to MongoDB.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Mongoose is added to the scaffolded application.",
    },
  ],
  conflicts: ORM_CONFLICTS,
  supports(context) {
    const node = supportsNodeNpmPnpm(context);
    if (!node.supported) {
      return node;
    }

    if (!context.integrationIds.includes("mongodb")) {
      return { supported: false, reason: "Mongoose requires the MongoDB integration." };
    }

    return { supported: true };
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "mongoose");
  },
  plan(context: PlanContext) {
    return [
      addPackages(context, [npmPin("mongoose", QUALIFIED_VERSIONS.mongoose)], {
        description: "Install Mongoose",
      }),
      {
        type: "create_directory",
        path: "src",
        behavior: "create_if_missing",
        description: "Create src for the Mongoose helper",
      },
      {
        type: "create_file",
        path: "src/mongoose.js",
        content: MONGOOSE_CLIENT,
        behavior: "fail_if_exists",
        description: "Add a Mongoose connect helper using MONGODB_URI",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "mongoose"),
      await missingAnyFile(
        context,
        ["src/mongoose.js", "src/mongoose.ts", "lib/mongoose.ts"],
        "a Mongoose connection helper",
      ),
      await missingEnvKeys(context, ".env.example", ["MONGODB_URI"]),
    ]);
  },
});
