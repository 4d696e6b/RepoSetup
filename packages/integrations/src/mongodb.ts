import {
  detectedResult,
  evidence,
  existingEnvKeys,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { DATABASE_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { failVerify, mergeVerify } from "./verify.js";

export const mongodbIntegration = defineIntegration({
  id: "mongodb",
  name: "MongoDB",
  category: "database",
  description: "Selects MongoDB as the database. RepoSetup does not install a database server.",
  status: "experimental",
  documentationUrl: "https://mongoosejs.com/docs/index.html",
  keywords: ["database", "mongo", "nosql"],
  verification: { verifiedAt: "2026-09-22" },
  conflicts: DATABASE_CONFLICTS,
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase supports MongoDB with Node.js only." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const pkg = context.packageJson;
    const hasDep =
      pkg !== undefined &&
      (hasPackageDependency(pkg, "mongodb") || hasPackageDependency(pkg, "mongoose"));
    const envExample = await context.files.readText(".env.example");
    const hasUrl =
      envExample !== undefined &&
      (/MONGODB_URI\s*=/.test(envExample) || /DATABASE_URL\s*=\s*"?mongodb:/.test(envExample));

    if (!hasDep && !hasUrl) {
      return notDetected();
    }

    const items = [];
    if (hasDep) {
      items.push(
        evidence("dependency", "package.json includes mongodb or mongoose", "package.json"),
      );
    }
    if (hasUrl) {
      items.push(evidence("file", ".env.example documents a MongoDB URL", ".env.example"));
    }

    return detectedResult(hasDep ? "certain" : "likely", items);
  },
  plan() {
    return [
      {
        type: "show_message",
        message:
          "MongoDB is a database server. RepoSetup will not install it. Provide MONGODB_URI yourself.",
        description: "Explain that MongoDB is not installed automatically",
      },
      {
        type: "add_env_example",
        path: ".env.example",
        entries: [{ key: "MONGODB_URI", placeholder: "mongodb://127.0.0.1:27017/DATABASE" }],
        description: "Document the Mongoose MongoDB URI placeholder",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    const env = await context.files.readText(".env.example");
    if (env === undefined || !existingEnvKeys(env).has("MONGODB_URI")) {
      return failVerify(
        ".env.example is missing MONGODB_URI.",
        "Add a placeholder MONGODB_URI. Doctor does not write env files.",
      );
    }

    return mergeVerify([]);
  },
});
