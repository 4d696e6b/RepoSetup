import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { firstExistingPath } from "./first-existing.js";

export const pythonIntegration = defineIntegration({
  id: "python",
  name: "Python",
  category: "runtime",
  description: "Detects the Python runtime before project setup.",
  status: "candidate",
  documentationUrl: "https://docs.python.org/3/using/index.html",
  keywords: ["python", "runtime"],
  verification: {
    verifiedAt: "2026-09-22",
    runtimeRange: ">=3.9",
  },
  supports(context) {
    if (context.runtimeId !== "python") {
      return { supported: false, reason: "This integration is the Python runtime." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const marker = await firstExistingPath(context.files, [
      "pyproject.toml",
      "uv.lock",
      "requirements.txt",
    ]);
    if (marker === undefined) {
      return notDetected();
    }

    return detectedResult("certain", [evidence("manifest", `Found ${marker}`, marker)]);
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "python",
        description: "Require Python on PATH (Flask documents a minimum of 3.9).",
      },
    ];
  },
});
