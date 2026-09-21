import type {
  DetectionContext,
  DetectionFileSystem,
  PackageJsonSummary,
} from "../integrations/definition.js";

import { readPackageJson } from "./package-json.js";

export async function createDetectionContext(
  projectRoot: string,
  files: DetectionFileSystem,
): Promise<DetectionContext> {
  const packageJson = await readPackageJson(files);
  const context: DetectionContext = { projectRoot, files };
  if (packageJson !== undefined) {
    context.packageJson = packageJson;
  }
  return context;
}

export async function packageJsonFrom(
  context: DetectionContext,
): Promise<PackageJsonSummary | undefined> {
  if (context.packageJson !== undefined) {
    return context.packageJson;
  }

  return readPackageJson(context.files);
}

export async function firstExistingPath(
  files: DetectionFileSystem,
  candidates: readonly string[],
): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (await files.exists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
