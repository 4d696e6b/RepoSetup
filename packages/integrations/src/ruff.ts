import {
  type DetectionContext,
  type DetectionResult,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { addPackages, afterPythonPackageInstall, removePackages } from "./operations.js";
import { detectPythonPackage } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { mergeVerify, missingPythonPackage } from "./verify.js";

const RUFF_CONFIG_PATHS = ["ruff.toml", ".ruff.toml"] as const;

export const ruffIntegration = defineIntegration({
  id: "ruff",
  name: "Ruff",
  category: "linting",
  description: "Adds Ruff as a development dependency.",
  status: "experimental",
  documentationUrl: "https://docs.astral.sh/ruff/installation/",
  keywords: ["format", "lint", "python"],
  verification: { verifiedAt: "2026-09-22" },
  addable: true,
  removable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Ruff is added to the scaffolded application.",
    },
  ],
  supports(context: SupportContext) {
    return supportsPythonUvPip(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectPythonPackage(context, "ruff", RUFF_CONFIG_PATHS);
  },
  plan(context) {
    return [
      addPackages(context, ["ruff"], {
        description: "Install Ruff as a development dependency",
        dev: true,
      }),
      ...afterPythonPackageInstall(context, "ruff"),
    ];
  },
  remove(context) {
    return [
      removePackages(context, ["ruff"], {
        description: "Remove Ruff",
      }),
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([await missingPythonPackage(context, "ruff")]);
  },
});
