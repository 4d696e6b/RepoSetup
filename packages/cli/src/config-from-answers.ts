import {
  SCHEMA_VERSION,
  type FrameworkConfig,
  type IntegrationSelection,
  type ProjectConfig,
  type RepoSetupConfig,
} from "@reposetup/core";

import type { CreateAnswers } from "./types.js";

export function configFromAnswers(answers: CreateAnswers): RepoSetupConfig {
  const project: ProjectConfig = { name: answers.projectName };
  if (answers.projectPath !== undefined) {
    project.path = answers.projectPath;
  }

  const framework: FrameworkConfig = { id: answers.frameworkId };
  if (answers.frameworkOptions !== undefined) {
    framework.options = answers.frameworkOptions;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    project,
    runtime: { id: answers.runtimeId },
    packageManager: answers.packageManager,
    framework,
    integrations: answers.integrations.map(copySelection),
  };
}

function copySelection(selection: IntegrationSelection): IntegrationSelection {
  const copied: IntegrationSelection = { id: selection.id };
  if (selection.options !== undefined) {
    copied.options = selection.options;
  }
  return copied;
}
