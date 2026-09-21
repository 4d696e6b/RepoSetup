import { createDetectionContext } from "../detection/context.js";
import { detectProject } from "../detection/detect-project.js";
import { createNodeDetectionFs } from "../detection/filesystem.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { PackageManager, RepoSetupConfig } from "../config/types.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import {
  exportConfigFromDetectedStack,
  projectNameFromStack,
  selectFrameworkId,
  selectPackageManager,
  selectRuntime,
} from "./config-from-detected.js";

export type ExportProjectResult =
  { ok: true; projectRoot: string; config: RepoSetupConfig } | { ok: false; error: RepoSetupError };

export async function exportProject(input: {
  startDir: string;
  registry: RegistryLookup;
  packageManager?: PackageManager;
}): Promise<ExportProjectResult> {
  const detected = await detectProject({
    startDir: input.startDir,
    registry: input.registry,
  });
  if (!detected.ok) {
    return detected;
  }

  const runtimeId = selectRuntime(detected.stack);
  if (runtimeId === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNSUPPORTED_CONTEXT",
        message: "Could not detect a runtime for this project.",
        suggestion: "Run reposetup export from a Node.js or Python project root.",
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
        message: "Could not detect a framework to export.",
        details: { requiredCategory: "framework" },
        suggestion: "Run reposetup export from a supported app, such as Next.js or FastAPI.",
      }),
    };
  }

  const files = createNodeDetectionFs(detected.stack.projectRoot);
  const context = await createDetectionContext(detected.stack.projectRoot, files);

  return {
    ok: true,
    projectRoot: detected.stack.projectRoot,
    config: exportConfigFromDetectedStack({
      stack: detected.stack,
      registry: input.registry,
      runtimeId,
      packageManager: packageManager.packageManager,
      frameworkId,
      projectName: projectNameFromStack(detected.stack, context.packageJson?.name),
      typescript: detected.stack.language?.id === "typescript",
    }),
  };
}
