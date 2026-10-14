import {
  textDeclaresPythonPackage,
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
import { detectPythonPackage, pythonManifestText } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { failVerify, mergeVerify, missingPythonPackage } from "./verify.js";

const SQLALCHEMY_DATABASE = `import os

from sqlalchemy import Engine, create_engine


def create_database_engine(url: str | None = None) -> Engine:
    """Build an engine without connecting; pass DATABASE_URL or set it in the environment."""
    connection_url = url if url is not None else os.environ.get("DATABASE_URL")
    if not connection_url:
        raise ValueError("DATABASE_URL is not set. See .env.example for the PostgreSQL placeholder.")
    return create_engine(connection_url)
`;

export const sqlalchemyIntegration = defineIntegration({
  id: "sqlalchemy",
  name: "SQLAlchemy",
  category: "orm",
  description:
    "Adds SQLAlchemy with the self-contained Psycopg PostgreSQL driver and engine helper.",
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
      addPackages(
        context,
        [
          pypiPin("SQLAlchemy", QUALIFIED_VERSIONS.sqlalchemy),
          pypiPin("psycopg[binary]", QUALIFIED_VERSIONS.psycopg),
        ],
        { description: "Install SQLAlchemy and the self-contained Psycopg PostgreSQL driver" },
      ),
      ...afterPythonPackageInstall(context, "SQLAlchemy and psycopg[binary]"),
      {
        type: "create_file",
        path: "database.py",
        content: SQLALCHEMY_DATABASE,
        behavior: "fail_if_exists",
        description: "Add a SQLAlchemy engine helper that uses DATABASE_URL without connecting",
      },
      {
        type: "show_message",
        message:
          "SQLAlchemy and its Psycopg driver are installed. Set DATABASE_URL to a postgresql+psycopg:// URL before calling database.create_database_engine(). RepoSetup does not start PostgreSQL or connect to it.",
        description: "Explain how to use the installed PostgreSQL driver",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    const env = await context.files.readText(".env.example");
    const manifest = await pythonManifestText(context);
    let driverIssue: VerificationResult | undefined;
    if (/DATABASE_URL\s*=\s*["']?postgresql\+psycopg:/.test(env ?? "")) {
      driverIssue = await missingPythonPackage(context, "psycopg");
    } else if (
      /DATABASE_URL\s*=\s*["']?postgresql(?::|\+psycopg2:)/.test(env ?? "") &&
      !textDeclaresPythonPackage(manifest, "psycopg2") &&
      !textDeclaresPythonPackage(manifest, "psycopg2-binary")
    ) {
      driverIssue = failVerify(
        "The PostgreSQL URL selects psycopg2, but the Python project does not declare its driver.",
        "Install the selected PostgreSQL driver, or use psycopg[binary] with a postgresql+psycopg:// URL. Doctor does not install packages or rewrite URLs.",
      );
    }
    return mergeVerify([await missingPythonPackage(context, "SQLAlchemy"), driverIssue]);
  },
});
