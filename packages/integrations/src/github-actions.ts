import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type PlanContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { missingAnyFile } from "./verify.js";

const NPM_WORKFLOW = `name: Node.js CI

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm test
`;

const PNPM_WORKFLOW = `name: Node.js CI

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
`;

export const githubActionsIntegration = defineIntegration({
  id: "github-actions",
  name: "GitHub Actions",
  category: "ci",
  description: "Adds a Node.js CI workflow using actions/checkout and actions/setup-node.",
  status: "experimental",
  documentationUrl: "https://github.com/actions/setup-node",
  keywords: ["ci", "github", "workflow"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "The workflow is added to the scaffolded Node.js application.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase writes a Node.js GitHub Actions workflow." };
    }

    if (context.packageManager !== "npm" && context.packageManager !== "pnpm") {
      return { supported: false, reason: "This phase writes npm or pnpm workflows only." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const workflows = await context.files.exists(".github/workflows");
    if (!workflows) {
      return notDetected();
    }

    return detectedResult("likely", [
      evidence("directory", "Found .github/workflows", ".github/workflows"),
    ]);
  },
  plan(context: PlanContext) {
    const content = context.config.packageManager === "pnpm" ? PNPM_WORKFLOW : NPM_WORKFLOW;
    return [
      {
        type: "create_directory",
        path: ".github/workflows",
        behavior: "create_if_missing",
        description: "Create the GitHub Actions workflow directory",
      },
      {
        type: "create_file",
        path: ".github/workflows/node.js.yml",
        content,
        behavior: "fail_if_exists",
        description: "Add a Node.js CI workflow",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return (
      (await missingAnyFile(
        context,
        [".github/workflows/node.js.yml", ".github/workflows/ci.yml"],
        "a GitHub Actions workflow",
      )) ?? { ok: true }
    );
  },
});
