import type { DetectionFileSystem, PackageJsonSummary } from "../integrations/definition.js";

export async function readPackageJson(
  files: DetectionFileSystem,
): Promise<PackageJsonSummary | undefined> {
  const text = await files.readText("package.json");
  if (text === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }

  const record = parsed as Record<string, unknown>;
  const summary: PackageJsonSummary = {
    dependencies: stringRecord(record.dependencies),
    devDependencies: stringRecord(record.devDependencies),
    optionalDependencies: stringRecord(record.optionalDependencies),
    peerDependencies: stringRecord(record.peerDependencies),
  };

  if (typeof record.name === "string" && record.name.length > 0) {
    summary.name = record.name;
  }
  if (typeof record.packageManager === "string" && record.packageManager.length > 0) {
    summary.packageManager = record.packageManager;
  }

  return summary;
}

export function hasPackageDependency(pkg: PackageJsonSummary, name: string): boolean {
  return (
    Object.hasOwn(pkg.dependencies, name) ||
    Object.hasOwn(pkg.devDependencies, name) ||
    Object.hasOwn(pkg.optionalDependencies, name) ||
    Object.hasOwn(pkg.peerDependencies, name)
  );
}

function stringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      result[key] = entry;
    }
  }
  return result;
}
