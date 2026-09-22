import {
  detectedResult,
  evidence,
  notDetected,
  textDeclaresPythonPackage,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

export async function pythonManifestText(context: DetectionContext): Promise<string> {
  const pyproject = await context.files.readText("pyproject.toml");
  const requirements = await context.files.readText("requirements.txt");
  return `${pyproject ?? ""}\n${requirements ?? ""}`;
}

export async function detectPythonPackage(
  context: DetectionContext,
  packageName: string,
  extraPaths: readonly string[] = [],
): Promise<DetectionResult> {
  const pyproject = await context.files.readText("pyproject.toml");
  const requirements = await context.files.readText("requirements.txt");
  const hasPyproject = pyproject !== undefined && textDeclaresPythonPackage(pyproject, packageName);
  const hasRequirements =
    requirements !== undefined && textDeclaresPythonPackage(requirements, packageName);
  const hasDep = hasPyproject || hasRequirements;
  let extraPath: string | undefined;
  for (const candidate of extraPaths) {
    if (await context.files.exists(candidate)) {
      extraPath = candidate;
      break;
    }
  }

  if (!hasDep && extraPath === undefined) {
    return notDetected();
  }

  const items = [];
  if (hasPyproject) {
    items.push(evidence("dependency", `project declares ${packageName}`, "pyproject.toml"));
  }
  if (hasRequirements) {
    items.push(evidence("dependency", `project declares ${packageName}`, "requirements.txt"));
  }
  if (extraPath !== undefined) {
    items.push(evidence("file", `Found ${extraPath}`, extraPath));
  }

  return detectedResult(hasDep ? "certain" : "likely", items);
}
