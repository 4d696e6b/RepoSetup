import type {
  DetectionContext,
  DetectionResult,
  SupportContext,
  VerificationContext,
  VerificationResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, afterPythonPackageInstall, removePackages } from "./operations.js";
import { QUALIFIED_VERSIONS, pypiPin } from "./qualified-versions.js";
import { detectPythonPackage } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { mergeVerify, missingPythonPackage } from "./verify.js";

const SAMPLE_TEST = `import asyncio

import httpx

from main import app


def test_httpx_can_call_the_fastapi_app() -> None:
    async def request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.get("/")

    response = asyncio.run(request())

    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}
`;

export const httpxIntegration = defineIntegration({
  id: "httpx",
  name: "HTTPX",
  category: "testing",
  description: "Adds HTTPX and an in-process FastAPI API response test.",
  status: "candidate",
  documentationUrl: "https://www.python-httpx.org/",
  keywords: ["python", "http", "api", "testing"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  removable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "pytest" },
      reason: "The HTTPX sample is a pytest API test.",
    },
  ],
  supports(context: SupportContext) {
    const python = supportsPythonUvPip(context);
    if (!python.supported) return python;
    if (context.frameworkId !== "fastapi") {
      return {
        supported: false,
        reason: "This release qualifies HTTPX API tests with FastAPI only.",
      };
    }
    return { supported: true };
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectPythonPackage(context, "httpx", ["test_httpx.py"]);
  },
  plan(context) {
    return [
      addPackages(context, [pypiPin("httpx", QUALIFIED_VERSIONS.httpx)], {
        description: "Install HTTPX for FastAPI API tests",
        dev: true,
      }),
      ...afterPythonPackageInstall(context, "httpx"),
      {
        type: "create_file",
        path: "test_httpx.py",
        content: SAMPLE_TEST,
        behavior: "fail_if_exists",
        description: "Add an HTTPX FastAPI response test",
      },
    ];
  },
  remove(context) {
    return [
      removePackages(context, ["httpx"], { description: "Remove HTTPX" }),
      {
        type: "show_message",
        message:
          "The HTTPX sample test is preserved so RepoSetup never deletes user-owned test files.",
        description: "Explain safe HTTPX removal",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([await missingPythonPackage(context, "httpx")]);
  },
});
