import {
  existingEnvKeys,
  hasPackageDependency,
  textDeclaresPythonPackage,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { firstExistingPath } from "./first-existing.js";
import { pythonManifestText } from "./python-detect.js";

export function failVerify(message: string, suggestion: string): VerificationResult {
  return { ok: false, message, suggestion };
}

export function mergeVerify(
  parts: ReadonlyArray<VerificationResult | undefined>,
): VerificationResult {
  const failed = parts.filter((part): part is VerificationResult => part !== undefined && !part.ok);
  if (failed.length === 0) {
    return { ok: true };
  }

  const message = failed
    .map((part) => part.message)
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(" ");
  const suggestion = failed
    .map((part) => part.suggestion)
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(" ");
  const result: VerificationResult = { ok: false, message };
  if (suggestion.length > 0) {
    result.suggestion = suggestion;
  }
  return result;
}

export async function missingPythonPackage(
  context: VerificationContext,
  packageName: string,
): Promise<VerificationResult | undefined> {
  const manifest = await pythonManifestText(context);
  if (textDeclaresPythonPackage(manifest, packageName)) {
    return undefined;
  }

  return failVerify(
    `The Python project does not declare ${packageName}.`,
    `Add ${packageName} with uv add or pip install. Doctor does not install packages.`,
  );
}

export function missingPackage(
  context: VerificationContext,
  packageName: string,
): VerificationResult | undefined {
  if (context.packageJson !== undefined && hasPackageDependency(context.packageJson, packageName)) {
    return undefined;
  }

  return failVerify(
    `package.json does not include ${packageName}.`,
    `Add ${packageName} to the project. Doctor does not install packages.`,
  );
}

export async function missingAnyFile(
  context: VerificationContext,
  candidates: readonly string[],
  label: string,
): Promise<VerificationResult | undefined> {
  const found = await firstExistingPath(context.files, candidates);
  if (found !== undefined) {
    return undefined;
  }

  return failVerify(`Expected ${label}.`, `Add ${label}. Doctor does not write config files.`);
}

export async function missingEnvKeys(
  context: VerificationContext,
  relativePath: string,
  keys: readonly string[],
): Promise<VerificationResult | undefined> {
  const text = await context.files.readText(relativePath);
  const present = text === undefined ? new Set<string>() : existingEnvKeys(text);
  const missing = keys.filter((key) => !present.has(key));
  if (missing.length === 0) {
    return undefined;
  }

  return failVerify(
    `${relativePath} is missing ${missing.join(", ")}.`,
    `Add placeholder ${missing.join(", ")} entries to ${relativePath}. Doctor does not write env files.`,
  );
}
