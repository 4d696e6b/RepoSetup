import {
  type DetectionContext,
  type DetectionResult,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { ORM_CONFLICTS } from "./conflicts.js";
import { defineIntegration } from "./define.js";
import { addPackages, afterPythonPackageInstall } from "./operations.js";
import { QUALIFIED_VERSIONS, pypiPin } from "./qualified-versions.js";
import { detectPythonPackage } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { mergeVerify, missingPythonPackage } from "./verify.js";

export const sqlalchemyIntegration = defineIntegration({
  id: "sqlalchemy",
  name: "SQLAlchemy",
  category: "orm",
  description: "Adds SQLAlchemy. RepoSetup does not install a PostgreSQL DBAPI.",
  status: "candidate",
  documentationUrl: "https://docs.sqlalchemy.org/en/20/intro.html",
  keywords: ["orm", "postgresql", "python", "sql"],
  verification: { verifiedAt: "2026-09-22" },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "SQLAlchemy is installed into the scaffolded application.",
    },
    {
      kind: "requires",
      target: { type: "integration", id: "postgresql" },
      reason: "This phase configures SQLAlchemy for PostgreSQL.",
    },
  ],
  conflicts: ORM_CONFLICTS,
  supports(context: SupportContext) {
    return supportsPythonUvPip(context);
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectPythonPackage(context, "SQLAlchemy");
  },
  plan(context) {
    return [
      addPackages(context, [pypiPin("SQLAlchemy", QUALIFIED_VERSIONS.sqlalchemy)], {
        description: "Install SQLAlchemy",
      }),
      ...afterPythonPackageInstall(context, "SQLAlchemy"),
      {
        type: "show_message",
        message:
          "SQLAlchemy's default PostgreSQL dialect uses a postgresql:// URL and a separate DBAPI. Install a PostgreSQL driver yourself; RepoSetup will not compile or install database drivers.",
        description: "Explain that a PostgreSQL DBAPI is not installed",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([await missingPythonPackage(context, "SQLAlchemy")]);
  },
});
