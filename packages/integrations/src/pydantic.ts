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

export const pydanticIntegration = defineIntegration({
  id: "pydantic",
  name: "Pydantic",
  category: "validation",
  description: "Adds Pydantic data validation.",
  status: "candidate",
  documentationUrl: "https://docs.pydantic.dev/latest/install/",
  keywords: ["python", "schema", "validation"],
  verification: { verifiedAt: "2026-09-22" },
  addable: true,
  removable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Pydantic is installed into the scaffolded application.",
    },
  ],
  supports(context: SupportContext) {
    return supportsPythonUvPip(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectPythonPackage(context, "pydantic");
  },
  plan(context) {
    return [
      addPackages(context, [pypiPin("pydantic", QUALIFIED_VERSIONS.pydantic)], {
        description: "Install Pydantic",
      }),
      ...afterPythonPackageInstall(context, "pydantic"),
    ];
  },
  remove(context) {
    return [
      removePackages(context, ["pydantic"], {
        description: "Remove Pydantic",
      }),
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([await missingPythonPackage(context, "pydantic")]);
  },
});
