import path from "node:path";

import {
  PACKAGE_MANAGERS,
  type PackageManager,
  type RepoSetupConfig,
  type RuntimeId,
} from "../config/types.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { isSafeProjectName } from "../paths/project-path.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import type { DetectedItem, DetectedStack } from "../detection/types.js";

const PRESENT: ReadonlySet<DetectedItem["confidence"]> = new Set(["certain", "likely"]);

export function presentItems(items: readonly DetectedItem[]): DetectedItem[] {
  return items.filter((item) => PRESENT.has(item.confidence));
}

export function selectRuntime(stack: DetectedStack): RuntimeId | undefined {
  const ids = new Set(presentItems(stack.runtimes).map((item) => item.id));
  if (ids.has("node")) {
    return "node";
  }
  if (ids.has("python")) {
    return "python";
  }
  return undefined;
}

export function selectPackageManager(
  stack: DetectedStack,
  override: PackageManager | undefined,
): { ok: true; packageManager: PackageManager } | { ok: false; error: RepoSetupError } {
  if (override !== undefined) {
    return { ok: true, packageManager: override };
  }

  const detected = presentItems(stack.packageManagers)
    .map((item) => item.id)
    .filter((id): id is PackageManager => (PACKAGE_MANAGERS as readonly string[]).includes(id));
  const unique = [...new Set(detected)];

  if (unique.length === 1) {
    return { ok: true, packageManager: unique[0] as PackageManager };
  }

  if (unique.length === 0) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "CONFIG_INVALID",
        message: "Could not detect a package manager for this project.",
        suggestion: "Pass --package-manager npm|pnpm|bun|uv|pip.",
      }),
    };
  }

  return {
    ok: false,
    error: createRepoSetupError({
      code: "CONFIG_INVALID",
      message: `Multiple package managers were detected (${unique.join(", ")}).`,
      details: { packageManagers: unique },
      suggestion: "Pass --package-manager to choose one.",
    }),
  };
}

export function selectFrameworkId(stack: DetectedStack): string | undefined {
  const frameworks = presentItems(stack.frameworks);
  if (frameworks.some((item) => item.id === "nextjs")) {
    return "nextjs";
  }
  if (frameworks.some((item) => item.id === "react-vite")) {
    return "react-vite";
  }
  if (frameworks.some((item) => item.id === "fastapi")) {
    return "fastapi";
  }
  if (frameworks.some((item) => item.id === "flask")) {
    return "flask";
  }
  if (frameworks.length === 1) {
    return frameworks[0]?.id;
  }
  return undefined;
}

export function projectNameFromStack(
  stack: DetectedStack,
  packageName: string | undefined,
): string {
  if (packageName !== undefined && isSafeProjectName(packageName)) {
    return packageName;
  }

  const base = path.basename(stack.projectRoot);
  if (isSafeProjectName(base)) {
    return base;
  }

  return "existing-project";
}

export function configFromDetectedStack(input: {
  stack: DetectedStack;
  registry: RegistryLookup;
  runtimeId: RuntimeId;
  packageManager: PackageManager;
  frameworkId: string;
  requestedId: string;
  projectName: string;
  typescript: boolean;
}): RepoSetupConfig {
  const integrations = presentItems(input.stack.integrations)
    .filter((item) => input.registry.get(item.id) !== undefined)
    .filter((item) => item.id !== input.frameworkId && item.id !== input.requestedId)
    .map((item) => ({ id: item.id }));

  integrations.push({ id: input.requestedId });

  const framework: RepoSetupConfig["framework"] = { id: input.frameworkId };
  if (input.typescript) {
    framework.options = { typescript: true };
  }

  return {
    schemaVersion: 1,
    project: { name: input.projectName, path: "." },
    runtime: { id: input.runtimeId },
    packageManager: input.packageManager,
    framework,
    integrations,
  };
}
