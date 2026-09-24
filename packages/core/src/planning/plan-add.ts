import { createDetectionContext } from "../detection/context.js";
import { detectProject } from "../detection/detect-project.js";
import { createNodeDetectionFs } from "../detection/filesystem.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
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
  if (await files.exists("pnpm-workspace.yaml")) {
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

function workspaceRootError(): RepoSetupError {
  return createRepoSetupError({
    code: "UNSUPPORTED_CONTEXT",
    message: "Adding integrations from a workspace root is ambiguous.",
    suggestion:
      "Run reposetup add from one workspace package directory. RepoSetup does not compose an entire workspace in this release.",
  });
}
