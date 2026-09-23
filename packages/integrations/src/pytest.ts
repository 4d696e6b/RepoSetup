import {
  type DetectionContext,
  type DetectionResult,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { addPackages, afterPythonPackageInstall, removePackages } from "./operations.js";
import { QUALIFIED_VERSIONS, pypiPin } from "./qualified-versions.js";
import { detectPythonPackage } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { mergeVerify, missingPythonPackage } from "./verify.js";

export const pytestIntegration = defineIntegration({
  id: "pytest",
  name: "pytest",
  category: "testing",
  description: "Adds pytest as a development dependency. Does not write sample tests.",
  status: "candidate",
  documentationUrl: "https://docs.pytest.org/en/stable/getting-started.html",
  keywords: ["python", "test"],
  verification: { verifiedAt: "2026-09-22" },
  addable: true,
  removable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "pytest is added to the scaffolded application.",
    },
  ],
  supports(context: SupportContext) {
    return supportsPythonUvPip(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectPythonPackage(context, "pytest", ["pytest.ini", "conftest.py"]);
  },
  plan(context) {
    return [
      addPackages(context, [pypiPin("pytest", QUALIFIED_VERSIONS.pytest)], {
        description: "Install pytest",
        dev: true,
      }),
      ...afterPythonPackageInstall(context, "pytest"),
    ];
  },
  remove(context) {
    return [
      removePackages(context, ["pytest"], {
        description: "Remove pytest",
      }),
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([await missingPythonPackage(context, "pytest")]);
  },
});
