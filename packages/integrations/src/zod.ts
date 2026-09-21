import { detectNpmPackage, type DetectionContext, type DetectionResult } from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages } from "./operations.js";
import { mergeVerify, missingPackage } from "./verify.js";

export const zodIntegration = defineIntegration({
  id: "zod",
  name: "Zod",
  category: "validation",
  description: "Adds Zod schema validation.",
  status: "experimental",
  documentationUrl: "https://zod.dev",
  keywords: ["schema", "typescript", "validation"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Zod is installed into the scaffolded application.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase supports Zod with Node.js only." };
    }

    return { supported: true };
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "zod");
  },
  plan(context) {
    return [
      addPackages(context, ["zod"], {
        description: "Install Zod",
      }),
    ];
  },
  async verify(context) {
    return mergeVerify([missingPackage(context, "zod")]);
  },
});
