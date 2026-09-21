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
import { pnpmCreateOrNpmInit, usesTypescript } from "./scaffold.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const PLAYWRIGHT_CONFIG_PATHS = [
  "playwright.config.ts",
  "playwright.config.js",
  "playwright.config.mts",
  "playwright.config.mjs",
] as const;

export const playwrightIntegration = defineIntegration({
  id: "playwright",
  name: "Playwright",
  category: "testing",
  description: "Adds Playwright Test with create-playwright. Browsers are not downloaded.",
  status: "experimental",
  documentationUrl: "https://playwright.dev/docs/intro",
  keywords: ["e2e", "browser", "test"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Playwright is added to the scaffolded application.",
    },
  ],
  supports(context) {
    return supportsNodeNpmPnpm(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "@playwright/test", PLAYWRIGHT_CONFIG_PATHS);
  },
  plan(context: PlanContext) {
    const lang = usesTypescript(context) ? "TypeScript" : "js";
    return [
      pnpmCreateOrNpmInit(
        context,
        { pnpmName: "playwright", npmInit: "playwright@latest" },
        ["--quiet", `--lang=${lang}`, "--no-browsers"],
        { description: "Initialize Playwright without downloading browsers", longRunning: true },
      ),
      {
        type: "show_message",
        message:
          "Playwright browsers were not downloaded. Run pnpm exec playwright install (or npx playwright install) when you need them. RepoSetup will not install browsers for you.",
        description: "Explain that Playwright browsers are not installed automatically",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      missingPackage(context, "@playwright/test"),
      await missingAnyFile(
        context,
        PLAYWRIGHT_CONFIG_PATHS,
        "a Playwright config (playwright.config.ts or playwright.config.js)",
      ),
    ]);
  },
});
