import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";

export const pnpmIntegration = defineIntegration({
  id: "pnpm",
  name: "pnpm",
  category: "package-manager",
  description: "Detects pnpm before installing JavaScript packages.",
  status: "candidate",
  documentationUrl: "https://pnpm.io/cli/add",
  keywords: ["node", "packages"],
  verification: { verifiedAt: VERIFIED_AT },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "pnpm installs packages for a Node.js project.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node" || context.packageManager !== "pnpm") {
      return { supported: false, reason: "Selected when the project package manager is pnpm." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const hasLockfile = await context.files.exists("pnpm-lock.yaml");
    const field = context.packageJson?.packageManager;
    const fieldIsPnpm = field !== undefined && field.startsWith("pnpm@");
    const hasWorkspace = await context.files.exists("pnpm-workspace.yaml");

    if (!hasLockfile && !fieldIsPnpm && !hasWorkspace) {
      return notDetected();
    }

    const items = [];
    if (hasLockfile) {
      items.push(evidence("lockfile", "Found pnpm-lock.yaml", "pnpm-lock.yaml"));
    }
    if (fieldIsPnpm && field !== undefined) {
      items.push(
        evidence("manifest", `package.json packageManager field is ${field}`, "package.json"),
      );
    }
    if (hasWorkspace) {
      items.push(evidence("config", "Found pnpm-workspace.yaml", "pnpm-workspace.yaml"));
    }

    const confidence = hasLockfile || fieldIsPnpm ? "certain" : "likely";
    return detectedResult(confidence, items);
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "pnpm",
        description: "Require pnpm on PATH.",
      },
    ];
  },
});
