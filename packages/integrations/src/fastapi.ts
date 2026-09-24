import {
  type DetectionContext,
  type DetectionResult,
  type InstallationOperation,
  type PlanContext,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { APP_FRAMEWORK_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { addPackages, afterPythonPackageInstall, initPythonProject } from "./operations.js";
import { QUALIFIED_VERSIONS } from "./qualified-versions.js";
import { detectPythonPackage } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { mergeVerify, missingAnyFile, missingPythonPackage } from "./verify.js";

const FASTAPI_README = `# FastAPI app

From this directory, start the development server with:

\`uv run fastapi dev\`

Run tests with \`uv run pytest\` after adding pytest to the project.
`;

const FASTAPI_MAIN = `from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}
`;

export const fastapiIntegration = defineIntegration({
  id: "fastapi",
  name: "FastAPI",
  category: "backend-framework",
  description: "Adds FastAPI with the official first-steps main.py app.",
  status: "candidate",
  documentationUrl: "https://fastapi.tiangolo.com/tutorial/",
  keywords: ["api", "http", "python", "server"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "FastAPI requires Python.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "package-manager" },
      reason: "FastAPI is installed with uv or pip.",
    },
  ],
  conflicts: APP_FRAMEWORK_CONFLICTS,
  supports(context: SupportContext) {
    return supportsPythonUvPip(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectPythonPackage(context, "fastapi", ["main.py"]);
  },
  plan(context: PlanContext) {
    const operations: InstallationOperation[] = [
      ...initPythonProject(context),
      addPackages(context, [`fastapi[standard]==${QUALIFIED_VERSIONS.fastapi}`], {
        description: "Install FastAPI with the official standard extras",
      }),
      ...afterPythonPackageInstall(context, "fastapi[standard]"),
      {
        type: "create_file",
        path: "main.py",
        content: FASTAPI_MAIN,
        behavior: "fail_if_exists",
        description: "Add the official FastAPI first-steps app",
      },
      {
        type: "create_file",
        path: "README.md",
        content: FASTAPI_README,
        behavior: "fail_if_exists",
        description: "Add FastAPI run instructions",
      },
      {
        type: "show_message",
        message:
          context.config.packageManager === "uv"
            ? "Run the app with uv run fastapi dev. RepoSetup will not start the server."
            : "Run the app with fastapi dev after activating your environment. RepoSetup will not start the server.",
        description: "Explain how to start the FastAPI development server",
      },
    ];

    return operations;
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      await missingPythonPackage(context, "fastapi"),
      await missingAnyFile(context, ["main.py"], "a FastAPI main.py entry file"),
    ]);
  },
});
