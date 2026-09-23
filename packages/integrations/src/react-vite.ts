import * as z from "zod";

import {
  detectedResult,
  evidence,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { APP_FRAMEWORK_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { firstExistingPath } from "./first-existing.js";
import { supportsNodeNpmPnpm, VITE_CONFIG_PATHS } from "./node-support.js";
import { requireNodeRange } from "./node-range.js";
import { NODE_ENGINE_RANGES, QUALIFIED_VERSIONS } from "./qualified-versions.js";
import { pnpmOrNpmCreate, usesTypescript } from "./scaffold.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const reactViteOptionsSchema = z.strictObject({
  typescript: z.boolean().optional(),
});

type ReactViteOptions = z.infer<typeof reactViteOptionsSchema>;

export const reactViteIntegration = defineIntegration<ReactViteOptions>({
  id: "react-vite",
  name: "React + Vite",
  category: "framework",
  description: "Scaffolds a React app with the official create-vite templates.",
  status: "candidate",
  documentationUrl: "https://vite.dev/guide/",
  keywords: ["react", "vite", "spa"],
  optionSchema: reactViteOptionsSchema,
  verification: {
    verifiedAt: "2026-09-22",
    runtimeRange: ">=20.19",
  },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "create-vite requires Node.js.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "package-manager" },
      reason: "create-vite is bootstrapped with npm or pnpm.",
    },
  ],
  conflicts: APP_FRAMEWORK_CONFLICTS,
  supports(context: SupportContext) {
    return supportsNodeNpmPnpm(context);
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const pkg = context.packageJson;
    const hasVite = pkg !== undefined && hasPackageDependency(pkg, "vite");
    const hasReact = pkg !== undefined && hasPackageDependency(pkg, "react");
    const config = await firstExistingPath(context.files, VITE_CONFIG_PATHS);

    if (!hasReact || (!hasVite && config === undefined)) {
      return notDetected();
    }

    const items = [];
    if (hasVite) {
      items.push(evidence("dependency", "package.json includes vite", "package.json"));
    }
    if (hasReact) {
      items.push(evidence("dependency", "package.json includes react", "package.json"));
    }
    if (config !== undefined) {
      items.push(evidence("config", `Found ${config}`, config));
    }

    const confidence =
      hasVite && hasReact ? "certain" : config !== undefined ? "likely" : "possible";
    return detectedResult(confidence, items);
  },
  plan(context: PlanContext<ReactViteOptions>) {
    const template = usesTypescript(context) ? "react-ts" : "react";
    const vite = `vite@${QUALIFIED_VERSIONS.vite}`;
    return [
      requireNodeRange(NODE_ENGINE_RANGES.vite, `Vite ${QUALIFIED_VERSIONS.vite}`),
      pnpmOrNpmCreate(
        context,
        { pnpmName: vite, npmName: vite },
        ["--template", template, "--no-interactive"],
        { description: "Scaffold React with create-vite", longRunning: true },
      ),
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "vite"),
      missingPackage(context, "react"),
      await missingAnyFile(
        context,
        VITE_CONFIG_PATHS,
        "a Vite config (vite.config.ts, vite.config.mts, vite.config.js, or vite.config.mjs)",
      ),
    ]);
  },
});
