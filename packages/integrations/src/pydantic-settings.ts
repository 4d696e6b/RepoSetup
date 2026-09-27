import {
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type SupportContext,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, afterPythonPackageInstall, removePackages } from "./operations.js";
import { QUALIFIED_VERSIONS, pypiPin } from "./qualified-versions.js";
import { detectPythonPackage } from "./python-detect.js";
import { supportsPythonUvPip } from "./python-support.js";
import { mergeVerify, missingPythonPackage } from "./verify.js";

const SETTINGS = `from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


def get_settings() -> Settings:
    return Settings()
`;

const SAMPLE_TEST = `import pytest
from pydantic import ValidationError

from settings import Settings


def test_settings_accepts_an_explicit_app_name() -> None:
    assert Settings(app_name="RepoSetup test").app_name == "RepoSetup test"


def test_settings_reports_missing_required_values(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("APP_NAME", raising=False)

    with pytest.raises(ValidationError, match="app_name"):
        Settings(_env_file=None)
`;

export const pydanticSettingsIntegration = defineIntegration({
  id: "pydantic-settings",
  name: "Pydantic Settings",
  category: "utility",
  description: "Adds typed environment settings with a safe .env.example and missing-value tests.",
  status: "candidate",
  documentationUrl: "https://docs.pydantic.dev/latest/concepts/pydantic_settings/",
  keywords: ["python", "pydantic", "environment", "settings"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  removable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "pydantic" },
      reason: "Pydantic Settings extends the Pydantic model layer.",
    },
    {
      kind: "requires",
      target: { type: "integration", id: "pytest" },
      reason: "The generated settings validation sample runs with pytest.",
    },
  ],
  supports(context: SupportContext) {
    const python = supportsPythonUvPip(context);
    if (!python.supported) return python;
    if (context.frameworkId !== "fastapi") {
      return {
        supported: false,
        reason: "This release qualifies Pydantic Settings with FastAPI only.",
      };
    }
    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const result = await detectPythonPackage(context, "pydantic-settings");
    return result.detected && (await context.files.exists("settings.py")) ? result : notDetected();
  },
  plan(context) {
    return [
      addPackages(context, [pypiPin("pydantic-settings", QUALIFIED_VERSIONS.pydanticSettings)], {
        description: "Install Pydantic Settings",
      }),
      ...afterPythonPackageInstall(context, "pydantic-settings"),
      {
        type: "create_file",
        path: ".env.example",
        content: "APP_NAME=RepoSetup app\n",
        behavior: "fail_if_exists",
        description: "Add a safe Pydantic Settings environment example",
      },
      {
        type: "create_file",
        path: "settings.py",
        content: SETTINGS,
        behavior: "fail_if_exists",
        description: "Add typed Pydantic Settings configuration",
      },
      {
        type: "create_file",
        path: "test_settings.py",
        content: SAMPLE_TEST,
        behavior: "fail_if_exists",
        description: "Add Pydantic Settings validation tests",
      },
      {
        type: "show_message",
        message:
          "Copy .env.example to .env and set APP_NAME. RepoSetup does not request or store secrets.",
        description: "Explain Pydantic Settings environment setup",
      },
    ];
  },
  remove(context) {
    return [
      removePackages(context, ["pydantic-settings"], { description: "Remove Pydantic Settings" }),
      {
        type: "show_message",
        message:
          "Settings source, tests, and .env.example are preserved so RepoSetup never deletes user-owned files.",
        description: "Explain safe Pydantic Settings removal",
      },
    ];
  },
  async verify(context: VerificationContext): Promise<VerificationResult> {
    return mergeVerify([await missingPythonPackage(context, "pydantic-settings")]);
  },
});
