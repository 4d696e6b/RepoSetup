import {
  detectNpmPackage,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { supportsNodeNpmPnpm } from "./node-support.js";
import { requireNodeRange } from "./node-range.js";
import { NODE_ENGINE_RANGES, QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { dlx } from "./scaffold.js";
import { mergeVerify, missingAnyFile } from "./verify.js";

export const shadcnIntegration = defineIntegration({
  id: "shadcn",
  name: "shadcn/ui",
  category: "ui",
  description: "Initializes shadcn/ui in an existing Next.js or Vite app.",
  status: "experimental",
  documentationUrl: "https://ui.shadcn.com/docs/cli",
  keywords: ["ui", "components", "radix"],
  verification: { verifiedAt: "2026-09-22" },
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
    return [
      requireNodeRange(NODE_ENGINE_RANGES.shadcn, `shadcn ${QUALIFIED_VERSIONS.shadcn}`),
      dlx(context, npmPin("shadcn", QUALIFIED_VERSIONS.shadcn), ["init", "--yes", "-t", template], {
        description: "Initialize shadcn/ui in the existing app",
      }),
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([await missingAnyFile(context, ["components.json"], "components.json")]);
  },
});
