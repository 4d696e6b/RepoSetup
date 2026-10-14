import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";

export const nodeIntegration = defineIntegration({
  id: "node",
  name: "Node.js",
  category: "runtime",
  description: "Detects the Node.js runtime before project setup.",
  status: "candidate",
  documentationUrl: "https://nodejs.org/en/download",
  keywords: ["nodejs", "javascript", "runtime"],
  verification: {
    verifiedAt: VERIFIED_AT,
    runtimeRange: ">=24",
  },
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This integration is the Node.js runtime." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    if (!(await context.files.exists("package.json"))) {
      return notDetected();
    }

    return detectedResult("certain", [evidence("manifest", "Found package.json", "package.json")]);
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "node",
        description: "Require Node.js 24 or later on PATH for RepoSetup and its generated recipes.",
      },
    ];
  },
});
