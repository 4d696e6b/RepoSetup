import { createDetectionContext } from "../detection/context.js";
import { detectProject } from "../detection/detect-project.js";
import { createNodeDetectionFs } from "../detection/filesystem.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { SelectionContext } from "../selection/format.js";
import type { IntegrationSelection } from "../config/types.js";
import type { PackageManager } from "../config/types.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import type { ResolutionResult } from "../resolution/types.js";

import {
  configFromDetectedStack,
  projectNameFromStack,
  selectFrameworkId,
  selectPackageManager,
  selectRuntime,
} from "./config-from-detected.js";
import { filterSatisfiedOperations } from "./delta.js";
import { batchInstallPackages } from "./batch-install.js";
import { consolidateManifestInstalls } from "./consolidate-manifests.js";
import { planInstallationSubset } from "./plan.js";
import { declaresPnpmWorkspacePackages } from "./pnpm-workspace.js";

export type PlanAddResult =
  | { ok: true; projectRoot: string; result: ResolutionResult }
  | { ok: false; error: RepoSetupError };

export async function planAdd(input: {
  startDir: string;
  integrationId: string;
  registry: RegistryLookup;
  packageManager?: PackageManager;
}): Promise<PlanAddResult> {
  return planAddMany({ ...input, integrationIds: [input.integrationId] });
}

export async function planAddMany(input: {
  startDir: string;
  integrationIds: readonly string[];
  selections?: readonly IntegrationSelection[];
  expectedContext?: SelectionContext;
  registry: RegistryLookup;
  packageManager?: PackageManager;
}): Promise<PlanAddResult> {
  const integrationIds = [...new Set(input.integrationIds)];
  if (integrationIds.length === 0) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "CONFIG_INVALID",
        message: "Select at least one integration to add.",
        suggestion: "Run reposetup search to list available integrations.",
      }),
    };
  }

  for (const integrationId of integrationIds) {
    const definition = input.registry.get(integrationId);
    if (definition === undefined) {
      return {
        ok: false,
        error: createRepoSetupError({
          code: "UNKNOWN_INTEGRATION",
          message: `Unknown integration "${integrationId}".`,
          details: { integrationId },
          suggestion: "Run reposetup search to list available integrations.",
        }),
      };
    }

    if (definition.addable !== true) {
      return {
        ok: false,
        error: createRepoSetupError({
          code: "UNSUPPORTED_CONTEXT",
          message: `Integration "${integrationId}" cannot be added to an existing project yet.`,
          details: { integrationId },
          suggestion:
            "This phase supports add for zod, prisma, vitest, prettier, drizzle, mongoose, pydantic, pytest, and ruff. Use reposetup create for new apps.",
        }),
      };
    }
  }

  const detected = await detectProject({
    startDir: input.startDir,
    registry: input.registry,
  });
  if (!detected.ok) {
    return { ok: false, error: detected.error };
  }

  const files = createNodeDetectionFs(detected.stack.projectRoot);
  if (await isAmbiguousWorkspaceRoot(files)) {
    return { ok: false, error: workspaceRootError() };
  }

  const runtimeId = selectRuntime(detected.stack);
  if (runtimeId === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNSUPPORTED_CONTEXT",
        message: "Could not detect a runtime for this project.",
        suggestion: "Add the integration from a Node.js or Python project root.",
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
        message: `Selected integrations need a detected framework in the current project.`,
        details: { integrationIds, requiredCategory: "framework" },
        suggestion: "Run reposetup add from an existing supported app, such as Next.js.",
      }),
    };
  }

  if (input.expectedContext !== undefined) {
    const expected = input.expectedContext;
    const typescript = detected.stack.language?.id === "typescript";
    if (
      expected.runtimeId !== runtimeId ||
      expected.frameworkId !== frameworkId ||
      expected.packageManager !== packageManager.packageManager ||
      (expected.typescript !== undefined && expected.typescript !== typescript) ||
      detected.stack.frameworks.filter((item) => item.confidence !== "possible").length !== 1 ||
      detected.stack.runtimes.filter((item) => item.confidence !== "possible").length !== 1
    ) {
      return {
        ok: false,
        error: createRepoSetupError({
          code: "UNSUPPORTED_CONTEXT",
          message: "Detected project does not match the selection context. No changes were made.",
          suggestion:
            "Export an add selection for the actual project framework, runtime, language and manager.",
        }),
      };
    }
  }

  const context = await createDetectionContext(detected.stack.projectRoot, files);
  const config = configFromDetectedStack({
    stack: detected.stack,
    registry: input.registry,
    runtimeId,
    packageManager: packageManager.packageManager,
    frameworkId,
    requestedIds: integrationIds,
    projectName: projectNameFromStack(detected.stack, context.packageJson?.name),
    typescript: detected.stack.language?.id === "typescript",
  });

  if (input.selections !== undefined) {
    if (
      input.selections.length !== integrationIds.length ||
      new Set(input.selections.map((item) => item.id)).size !== integrationIds.length ||
      input.selections.some((item) => !integrationIds.includes(item.id))
    ) {
      return {
        ok: false,
        error: createRepoSetupError({
          code: "CONFIG_INVALID",
          message: "Add options must match the requested integration IDs.",
        }),
      };
    }
    const byId = new Map(input.selections.map((item) => [item.id, item]));
    config.integrations = config.integrations.map((item) => byId.get(item.id) ?? item);
  }
  const planned = planInstallationSubset(config, input.registry, integrationIds);
  if (!planned.valid) {
    return { ok: true, projectRoot: detected.stack.projectRoot, result: planned };
  }

  const remaining = await filterSatisfiedOperations(planned.operations, files, context.packageJson);
  const batched = batchInstallPackages(remaining);
  if (!batched.ok) {
    return {
      ok: true,
      projectRoot: detected.stack.projectRoot,
      result: {
        ...planned,
        valid: false,
        operations: [],
        errors: [...planned.errors, batched.error],
      },
    };
  }

  const consolidated = consolidateManifestInstalls(batched.operations);
  if (!consolidated.ok) {
    return {
      ok: true,
      projectRoot: detected.stack.projectRoot,
      result: {
        ...planned,
        valid: false,
        operations: [],
        errors: [...planned.errors, consolidated.error],
      },
    };
  }

  return {
    ok: true,
    projectRoot: detected.stack.projectRoot,
    result: {
      ...planned,
      operations: consolidated.operations,
    },
  };
}

async function isAmbiguousWorkspaceRoot(
  files: ReturnType<typeof createNodeDetectionFs>,
): Promise<boolean> {
  const content = await files.readText("pnpm-workspace.yaml");
  return content !== undefined && declaresPnpmWorkspacePackages(content);
}

function workspaceRootError(): RepoSetupError {
  return createRepoSetupError({
    code: "UNSUPPORTED_CONTEXT",
    message: "Adding integrations from a workspace root is ambiguous.",
    suggestion:
      "Run reposetup add from one workspace package directory. RepoSetup does not compose an entire workspace in this release.",
  });
}
