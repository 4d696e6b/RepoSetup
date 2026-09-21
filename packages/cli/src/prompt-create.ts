import { checkbox, confirm, input, select } from "@inquirer/prompts";
import {
  INTEGRATION_CATEGORIES,
  isSafeProjectName,
  PACKAGE_MANAGERS,
  RUNTIME_IDS,
  type IntegrationCategory,
  type IntegrationDefinition,
  type PackageManager,
  type RuntimeId,
} from "@reposetup/core";

import type { CreateAnswers, PromptCreateContext } from "./types.js";

const PACKAGE_MANAGERS_BY_RUNTIME: Record<RuntimeId, readonly PackageManager[]> = {
  node: ["npm", "pnpm", "bun"],
  python: ["uv", "pip"],
};

const OPTIONAL_PROMPT_GROUPS: Array<{
  title: string;
  categories: readonly IntegrationCategory[];
}> = [
  { title: "Styling", categories: ["styling"] },
  { title: "UI", categories: ["ui"] },
  { title: "Database", categories: ["database"] },
  { title: "ORM/data layer", categories: ["orm"] },
  { title: "Validation", categories: ["validation"] },
  { title: "Testing", categories: ["testing"] },
  { title: "Quality tools", categories: ["linting", "formatting"] },
  { title: "Infrastructure", categories: ["infrastructure", "ci"] },
];

export async function promptCreate(context: PromptCreateContext): Promise<CreateAnswers> {
  const projectName = await promptProjectName(context.projectName);
  const runtimeId = await promptRuntime(context.runtimeId);
  const packageManager = await promptPackageManager(runtimeId, context.packageManager);
  const framework = await promptFramework(context, runtimeId, packageManager);
  const frameworkOptions = await promptFrameworkOptions(runtimeId, context.typescript);

  const selectedIds = [framework.id];
  const integrations: CreateAnswers["integrations"] = [];

  for (const group of OPTIONAL_PROMPT_GROUPS) {
    const chosen = await promptOptionalGroup(group, {
      registry: context.registry,
      runtimeId,
      packageManager,
      frameworkId: framework.id,
      selectedIds,
    });

    for (const id of chosen) {
      selectedIds.push(id);
      integrations.push({ id });
    }
  }

  const answers: CreateAnswers = {
    projectName,
    projectPath: projectName,
    runtimeId,
    packageManager,
    frameworkId: framework.id,
    integrations,
  };

  if (frameworkOptions !== undefined) {
    answers.frameworkOptions = frameworkOptions;
  }

  return answers;
}

async function promptProjectName(preset: string | undefined): Promise<string> {
  if (preset !== undefined && isSafeProjectName(preset)) {
    return preset;
  }

  return input({
    message: "Project name",
    ...(preset === undefined ? {} : { default: preset }),
    validate(value) {
      if (!isSafeProjectName(value)) {
        return "Use a single directory name without path separators or '..'.";
      }
      return true;
    },
  });
}

async function promptRuntime(preset: RuntimeId | undefined): Promise<RuntimeId> {
  if (preset !== undefined && isRuntimeId(preset)) {
    return preset;
  }

  return select({
    message: "Runtime",
    choices: RUNTIME_IDS.map((id) => ({ value: id, name: id })),
    default: preset ?? "node",
  });
}

async function promptPackageManager(
  runtimeId: RuntimeId,
  preset: PackageManager | undefined,
): Promise<PackageManager> {
  const allowed = PACKAGE_MANAGERS_BY_RUNTIME[runtimeId];
  if (preset !== undefined && allowed.includes(preset)) {
    return preset;
  }

  const defaultManager = allowed[0];
  if (defaultManager === undefined) {
    throw new Error(`No package managers are available for runtime "${runtimeId}".`);
  }

  return select({
    message: "Package manager",
    choices: allowed.map((id) => ({ value: id, name: id })),
    default: defaultManager,
  });
}

async function promptFramework(
  context: PromptCreateContext,
  runtimeId: RuntimeId,
  packageManager: PackageManager,
): Promise<IntegrationDefinition> {
  if (context.frameworkId !== undefined) {
    const existing = context.registry.get(context.frameworkId);
    if (existing !== undefined) {
      return existing;
    }
  }

  const frameworks = [
    ...context.registry.byCategory("framework"),
    ...context.registry.byCategory("backend-framework"),
  ].filter(
    (definition) =>
      definition.supports({
        runtimeId,
        packageManager,
        frameworkId: definition.id,
        integrationIds: [definition.id],
      }).supported,
  );

  if (frameworks.length === 0) {
    throw new Error("No framework integrations are registered yet.");
  }

  const selectedId = await select({
    message: "Framework",
    choices: frameworks.map((definition) => ({
      value: definition.id,
      name: definition.name,
      description: definition.description,
    })),
    ...(context.frameworkId === undefined ? {} : { default: context.frameworkId }),
  });

  const selected = context.registry.get(selectedId);
  if (selected === undefined) {
    throw new Error(`Framework "${selectedId}" is not in the registry.`);
  }

  return selected;
}

async function promptFrameworkOptions(
  runtimeId: RuntimeId,
  typescriptPreset: boolean | undefined,
): Promise<Record<string, unknown> | undefined> {
  if (runtimeId !== "node") {
    return undefined;
  }

  const typescript =
    typescriptPreset ??
    (await confirm({
      message: "Use TypeScript?",
      default: true,
    }));

  return { typescript };
}

async function promptOptionalGroup(
  group: { title: string; categories: readonly IntegrationCategory[] },
  context: {
    registry: PromptCreateContext["registry"];
    runtimeId: RuntimeId;
    packageManager: PackageManager;
    frameworkId: string;
    selectedIds: string[];
  },
): Promise<string[]> {
  const choices = group.categories.flatMap((category) =>
    context.registry.byCategory(category).filter(
      (definition) =>
        definition.supports({
          runtimeId: context.runtimeId,
          packageManager: context.packageManager,
          frameworkId: context.frameworkId,
          integrationIds: context.selectedIds,
        }).supported,
    ),
  );

  if (choices.length === 0) {
    return [];
  }

  return checkbox({
    message: group.title,
    choices: choices.map((definition) => ({
      value: definition.id,
      name: `${definition.name} (${definition.id})`,
      description: definition.description,
    })),
  });
}

function isRuntimeId(value: string): value is RuntimeId {
  return (RUNTIME_IDS as readonly string[]).includes(value);
}

export function isKnownPackageManager(value: string): value is PackageManager {
  return (PACKAGE_MANAGERS as readonly string[]).includes(value);
}

export function isKnownCategory(value: string): value is IntegrationCategory {
  return (INTEGRATION_CATEGORIES as readonly string[]).includes(value);
}
