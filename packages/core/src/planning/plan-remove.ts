import { createDetectionContext } from "../detection/context.js";
import { detectProject } from "../detection/detect-project.js";
import { createNodeDetectionFs } from "../detection/filesystem.js";
import type { DetectedItem, DetectedStack } from "../detection/types.js";
import { createRepoSetupError, isRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { UNSAFE_REMOVE_MESSAGE } from "../errors/unsafe-remove.js";
import type { IntegrationCategory } from "../categories/integration-category.js";
import type { PackageManager } from "../config/types.js";
import type { PlanContext } from "../integrations/definition.js";
import type { InstallationOperation } from "../operations/types.js";
import type { ProjectRelativePath } from "../paths/project-path.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import type { ResolutionResult } from "../resolution/types.js";

import {
  exportConfigFromDetectedStack,
  presentItems,
  projectNameFromStack,
  selectFrameworkId,
  selectPackageManager,
  selectRuntime,
} from "./config-from-detected.js";
import { filterRemoveOperations } from "./remove-delta.js";
import { validateInstallationPlan } from "./validate-plan.js";

const NEVER_REMOVE_CATEGORIES: ReadonlySet<IntegrationCategory> = new Set([
  "runtime",
  "package-manager",
  "framework",
  "backend-framework",
]);

export type PlanRemoveResult =
  | { ok: true; projectRoot: string; result: ResolutionResult }
  | { ok: false; error: RepoSetupError };

export async function planRemove(input: {
  startDir: string;
  integrationId: string;
  registry: RegistryLookup;
  packageManager?: PackageManager;
}): Promise<PlanRemoveResult> {
  const definition = input.registry.get(input.integrationId);
  if (definition === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNKNOWN_INTEGRATION",
        message: `Unknown integration "${input.integrationId}".`,
        details: { integrationId: input.integrationId },
        suggestion: "Run reposetup search to list available integrations.",
      }),
    };
  }

  if (
    definition.removable !== true ||
    definition.remove === undefined ||
    NEVER_REMOVE_CATEGORIES.has(definition.category)
  ) {
    return { ok: false, error: unsafeRemoveError(input.integrationId) };
  }

  const detected = await detectProject({
    startDir: input.startDir,
    registry: input.registry,
  });
  if (!detected.ok) {
    return { ok: false, error: detected.error };
  }

  const runtimeId = selectRuntime(detected.stack);
  if (runtimeId === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNSUPPORTED_CONTEXT",
        message: "Could not detect a runtime for this project.",
        suggestion: "Remove the integration from a Node.js or Python project root.",
      }),
    };
  }

  const packageManager = selectPackageManager(detected.stack, input.packageManager);
  if (!packageManager.ok) {
    return { ok: false, error: packageManager.error };
  }

  const frameworkId = selectFrameworkId(detected.stack);
  if (frameworkId === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "MISSING_REQUIREMENT",
        message: `Integration "${input.integrationId}" needs a detected framework in the current project.`,
        details: { integrationId: input.integrationId, requiredCategory: "framework" },
        suggestion: "Run reposetup remove from an existing supported app, such as Next.js.",
      }),
    };
  }

  const dependents = integrationsThatRequire(input.integrationId, detected.stack, input.registry);
  if (dependents.length > 0) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNSUPPORTED_CONTEXT",
        message: `Cannot remove "${input.integrationId}" while ${dependents.join(", ")} still requires it.`,
        details: { integrationId: input.integrationId, dependents },
        suggestion: "Remove the dependent integration first, or uninstall the package yourself.",
      }),
    };
  }

  const files = createNodeDetectionFs(detected.stack.projectRoot);
  const context = await createDetectionContext(detected.stack.projectRoot, files);
  const config = {
    ...exportConfigFromDetectedStack({
      stack: detected.stack,
      registry: input.registry,
      runtimeId,
      packageManager: packageManager.packageManager,
      frameworkId,
      projectName: projectNameFromStack(detected.stack, context.packageJson?.name),
      typescript: detected.stack.language?.id === "typescript",
    }),
    project: {
      name: projectNameFromStack(detected.stack, context.packageJson?.name),
      path: "." as const,
    },
  };

  const planContext: PlanContext = {
    config,
    options: {},
    projectRoot: "." as ProjectRelativePath,
  };

  let generated: InstallationOperation[];
  try {
    generated = definition.remove(planContext);
  } catch (error) {
    if (isRepoSetupError(error)) {
      return { ok: false, error };
    }

    return {
      ok: false,
      error: createRepoSetupError({
        code: "PLAN_INVALID",
        message: `Integration "${input.integrationId}" failed while generating remove operations.`,
        details: { integrationId: input.integrationId },
        suggestion: "Integration remove() must be pure and must not throw.",
      }),
    };
  }

  if (!Array.isArray(generated)) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "PLAN_INVALID",
        message: `Integration "${input.integrationId}" did not return a remove operation array.`,
        details: { integrationId: input.integrationId },
        suggestion: "Integration remove() must return InstallationOperation[].",
      }),
    };
  }

  const operations = await filterRemoveOperations(generated, files, context.packageJson);
  const validation = validateInstallationPlan(operations);
  const ordered = [{ id: definition.id, category: definition.category }];

  if (!validation.valid) {
    return {
      ok: true,
      projectRoot: detected.stack.projectRoot,
      result: {
        valid: false,
        config,
        orderedIntegrations: [],
        warnings: [],
        errors: validation.errors,
        operations: [],
      },
    };
  }

  return {
    ok: true,
    projectRoot: detected.stack.projectRoot,
    result: {
      valid: true,
      config,
      orderedIntegrations: ordered,
      warnings: [],
      errors: [],
      operations: validation.operations,
    },
  };
}

export function unsafeRemoveError(integrationId: string): RepoSetupError {
  return createRepoSetupError({
    code: "UNSUPPORTED_CONTEXT",
    message: UNSAFE_REMOVE_MESSAGE,
    details: { integrationId },
    suggestion:
      "This phase only uninstalls packages for zod, prettier, pydantic, pytest, and ruff. It never reverses an install plan.",
  });
}

function integrationsThatRequire(
  integrationId: string,
  stack: DetectedStack,
  registry: RegistryLookup,
): string[] {
  const present: DetectedItem[] = [
    ...presentItems(stack.frameworks),
    ...presentItems(stack.integrations),
  ].filter((item) => item.id !== integrationId);

  const dependents: string[] = [];
  for (const item of present) {
    const other = registry.get(item.id);
    for (const requirement of other?.requirements ?? []) {
      if (requirement.target.type === "integration" && requirement.target.id === integrationId) {
        dependents.push(item.id);
      }
    }
  }

  return dependents;
}
