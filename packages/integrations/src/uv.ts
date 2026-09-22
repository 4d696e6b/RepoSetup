import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";

export const uvIntegration = defineIntegration({
  id: "uv",
  name: "uv",
  category: "package-manager",
  description: "Detects uv before installing Python packages.",
  status: "candidate",
  documentationUrl: "https://docs.astral.sh/uv/reference/cli/#uv-add",
  keywords: ["python", "packages"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "uv installs packages for a Python project.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "python" || context.packageManager !== "uv") {
      return { supported: false, reason: "Selected when the project package manager is uv." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const hasLockfile = await context.files.exists("uv.lock");
    const pyproject = await context.files.readText("pyproject.toml");
    const hasToolUv = pyproject !== undefined && /\[tool\.uv\b/.test(pyproject);

    if (!hasLockfile && !hasToolUv) {
      return notDetected();
    }

    const items = [];
    if (hasLockfile) {
      items.push(evidence("lockfile", "Found uv.lock", "uv.lock"));
    }
    if (hasToolUv) {
      items.push(evidence("config", "pyproject.toml declares [tool.uv]", "pyproject.toml"));
    }

    return detectedResult(hasLockfile ? "certain" : "likely", items);
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "uv",
        description: "Require uv on PATH.",
      },
    ];
  },
});
