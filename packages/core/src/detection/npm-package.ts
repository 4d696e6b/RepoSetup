import type { DetectionContext, DetectionResult } from "../integrations/definition.js";

import { packageJsonFrom } from "./context.js";
import { hasPackageDependency } from "./package-json.js";
import { detectedResult, evidence, notDetected } from "./result.js";

export async function detectNpmPackage(
  context: DetectionContext,
  packageName: string,
  configPaths: readonly string[] = [],
): Promise<DetectionResult> {
  const pkg = await packageJsonFrom(context);
  const hasDependency = pkg !== undefined && hasPackageDependency(pkg, packageName);
  const configPath = await firstPresent(context, configPaths);

  if (!hasDependency && configPath === undefined) {
    return notDetected();
  }

  const items = [];
  if (hasDependency) {
    items.push(evidence("dependency", `package.json includes ${packageName}`, "package.json"));
  }
  if (configPath !== undefined) {
    items.push(evidence("config", `Found ${configPath}`, configPath));
  }

  return detectedResult(hasDependency ? "certain" : "likely", items);
}

async function firstPresent(
  context: DetectionContext,
  paths: readonly string[],
): Promise<string | undefined> {
  for (const candidate of paths) {
    if (await context.files.exists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
