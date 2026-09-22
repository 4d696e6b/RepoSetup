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

  if (definition.addable !== true) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNSUPPORTED_CONTEXT",
        message: `Integration "${input.integrationId}" cannot be added to an existing project yet.`,
        details: { integrationId: input.integrationId },
        suggestion:
          "This phase supports add for zod, prisma, vitest, prettier, drizzle, mongoose, pydantic, pytest, and ruff. Use reposetup create for new apps.",
      }),
    };
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
        message: `Integration "${input.integrationId}" needs a detected framework in the current project.`,
        details: { integrationId: input.integrationId, requiredCategory: "framework" },
        suggestion: "Run reposetup add from an existing supported app, such as Next.js.",
      }),
    };
  }

  const files = createNodeDetectionFs(detected.stack.projectRoot);
  const context = await createDetectionContext(detected.stack.projectRoot, files);
  const config = configFromDetectedStack({
    stack: detected.stack,
    registry: input.registry,
    runtimeId,
    packageManager: packageManager.packageManager,
    frameworkId,
    requestedId: input.integrationId,
    projectName: projectNameFromStack(detected.stack, context.packageJson?.name),
    typescript: detected.stack.language?.id === "typescript",
  });

  const planned = planInstallationSubset(config, input.registry, [input.integrationId]);
  if (!planned.valid) {
    return { ok: true, projectRoot: detected.stack.projectRoot, result: planned };
  }

  const operations = await filterSatisfiedOperations(
    planned.operations,
    files,
    context.packageJson,
  );

  return {
    ok: true,
    projectRoot: detected.stack.projectRoot,
    result: {
      ...planned,
      operations,
    },
  };
}
