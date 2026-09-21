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
import { detectPythonPackage } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { mergeVerify, missingAnyFile, missingPythonPackage } from "./verify.js";

const FLASK_APP = `from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"
`;

export const flaskIntegration = defineIntegration({
  id: "flask",
  name: "Flask",
  category: "backend-framework",
  description: "Adds Flask with the official quickstart app.py so flask run works without --app.",
  status: "experimental",
  documentationUrl: "https://flask.palletsprojects.com/en/stable/installation/",
  keywords: ["api", "http", "python", "server"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "Flask requires Python 3.9 or later.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "package-manager" },
      reason: "Flask is installed with uv or pip.",
    },
  ],
  conflicts: APP_FRAMEWORK_CONFLICTS,
  supports(context: SupportContext) {
    return supportsPythonUvPip(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectPythonPackage(context, "Flask", ["app.py"]);
  },
  plan(context: PlanContext) {
    const operations: InstallationOperation[] = [
      ...initPythonProject(context),
      addPackages(context, ["Flask"], {
        description: "Install Flask",
      }),
      ...afterPythonPackageInstall(context, "Flask"),
      {
        type: "create_file",
        path: "app.py",
        content: FLASK_APP,
        behavior: "fail_if_exists",
        description: "Add the official Flask quickstart app as app.py",
      },
      {
        type: "show_message",
        message:
          context.config.packageManager === "uv"
            ? "Run the app with uv run flask run. app.py is auto-discovered. RepoSetup will not start the server."
            : "Run the app with flask run. app.py is auto-discovered. RepoSetup will not start the server.",
        description: "Explain how to start the Flask development server",
      },
    ];

    return operations;
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      await missingPythonPackage(context, "Flask"),
      await missingAnyFile(context, ["app.py"], "a Flask app.py entry file"),
    ]);
  },
});
