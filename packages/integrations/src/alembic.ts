import {
  type DetectionContext,
  type DetectionResult,
  type InstallationOperation,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { addPackages, afterPythonPackageInstall, runPythonTool } from "./operations.js";
import { QUALIFIED_VERSIONS, pypiPin } from "./qualified-versions.js";
import { detectPythonPackage } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { mergeVerify, missingAnyFile, missingPythonPackage } from "./verify.js";

export const alembicIntegration = defineIntegration({
  id: "alembic",
  name: "Alembic",
  category: "migration",
  description: "Adds Alembic and initializes the official alembic/ environment.",
  status: "candidate",
  documentationUrl: "https://alembic.sqlalchemy.org/en/latest/tutorial.html",
  keywords: ["migration", "python", "sqlalchemy"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "sqlalchemy" },
      reason: "Alembic generates SQLAlchemy migration environments.",
    },
  ],
  supports(context: SupportContext) {
    return supportsPythonUvPip(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectPythonPackage(context, "alembic", ["alembic.ini"]);
  },
  plan(context) {
    const operations: InstallationOperation[] = [
      addPackages(context, [pypiPin("alembic", QUALIFIED_VERSIONS.alembic)], {
        description: "Install Alembic",
      }),
      ...afterPythonPackageInstall(context, "alembic"),
      runPythonTool(context, "alembic", ["init", "alembic"], {
        description: "Create the official Alembic migration environment",
      }),
      {
        type: "show_message",
        message:
          "Edit alembic.ini database URL before migrating. RepoSetup will not run migrations.",
        description: "Explain that Alembic migrations are not applied automatically",
      },
    ];

    if (context.config.integrations.some((integration) => integration.id === "ruff")) {
      operations.splice(
        operations.length - 1,
        0,
        runPythonTool(context, "ruff", ["check", "--fix", "alembic/env.py"], {
          description: "Fix lint-safe import ordering in Alembic's generated environment",
        }),
      );
    }

    return operations;
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([
      await missingPythonPackage(context, "alembic"),
      await missingAnyFile(context, ["alembic.ini"], "alembic.ini"),
    ]);
  },
});
