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

const FASTAPI_TEST = `from fastapi.testclient import TestClient

from main import app


def test_root_returns_hello_world() -> None:
    response = TestClient(app).get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}
`;

export const pytestIntegration = defineIntegration({
  id: "pytest",
  name: "pytest",
  category: "testing",
  description: "Adds pytest as a development dependency and a FastAPI endpoint test.",
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
      ...(context.config.framework.id === "fastapi"
        ? [
            {
              type: "create_file" as const,
              path: "test_main.py",
              content: FASTAPI_TEST,
              behavior: "fail_if_exists" as const,
              description: "Add a FastAPI endpoint response test",
            },
          ]
        : []),
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
