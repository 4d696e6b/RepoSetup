import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";

export const pipIntegration = defineIntegration({
  id: "pip",
  name: "pip",
  category: "package-manager",
  description: "Detects pip from a requirements file before installing Python packages.",
  status: "experimental",
  documentationUrl: "https://pip.pypa.io/en/stable/cli/pip_install/",
  keywords: ["python", "packages"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "pip installs packages for a Python project.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "python" || context.packageManager !== "pip") {
      return { supported: false, reason: "Selected when the project package manager is pip." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    if (await context.files.exists("uv.lock")) {
      return notDetected();
    }

    if (!(await context.files.exists("requirements.txt"))) {
      return notDetected();
    }

    return detectedResult("likely", [
      evidence("file", "Found requirements.txt", "requirements.txt"),
    ]);
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "pip",
        description: "Require python on PATH so python -m pip can run.",
      },
    ];
  },
});
