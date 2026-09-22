import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { firstExistingPath } from "./first-existing.js";

export const npmIntegration = defineIntegration({
  id: "npm",
  name: "npm",
  category: "package-manager",
  description: "Detects npm before installing JavaScript packages.",
  status: "candidate",
  documentationUrl: "https://docs.npmjs.com/cli/v12/commands/npm-install/",
  keywords: ["node", "packages"],
  verification: { verifiedAt: VERIFIED_AT },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "npm installs packages for a Node.js project.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node" || context.packageManager !== "npm") {
      return { supported: false, reason: "Selected when the project package manager is npm." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const lockfile = await firstExistingPath(context.files, [
      "package-lock.json",
      "npm-shrinkwrap.json",
    ]);
    const field = context.packageJson?.packageManager;
    const fieldIsNpm = field !== undefined && field.startsWith("npm@");

    if (lockfile === undefined && !fieldIsNpm) {
      return notDetected();
    }

    const items = [];
    if (lockfile !== undefined) {
      items.push(evidence("lockfile", `Found ${lockfile}`, lockfile));
    }
    if (fieldIsNpm && field !== undefined) {
      items.push(
        evidence("manifest", `package.json packageManager field is ${field}`, "package.json"),
      );
    }

    return detectedResult("certain", items);
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "npm",
        description: "Require npm on PATH.",
      },
    ];
  },
});
