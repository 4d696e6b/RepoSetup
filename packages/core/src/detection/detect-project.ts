import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { DetectionContext } from "../integrations/definition.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import { createDetectionContext } from "./context.js";
import { detectEcosystem } from "./ecosystem.js";
import { createNodeDetectionFs } from "./filesystem.js";
import { findProjectRoot } from "./project-root.js";
import type { DetectedItem, DetectedStack } from "./types.js";

export type DetectProjectResult =
  { ok: true; stack: DetectedStack } | { ok: false; error: RepoSetupError };

export async function detectProject(input: {
  startDir: string;
  registry: RegistryLookup;
}): Promise<DetectProjectResult> {
  const projectRoot = await findProjectRoot(input.startDir);
  if (projectRoot === undefined) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "PROJECT_NOT_FOUND",
        message: "No project root was found from the current directory.",
        details: { startDir: input.startDir },
        suggestion:
          "Run this command from a Node or Python project directory (package.json, pyproject.toml, or a lockfile).",
      }),
    };
  }

  const context = await createDetectionContext(projectRoot, createNodeDetectionFs(projectRoot));
  const ecosystem = await detectEcosystem(context);
  const fromRegistry = await detectRegistryItems(input.registry, context);

  const runtimes = mergeItems(ecosystem.runtimes, fromRegistry.runtimes);
  const packageManagers = mergeItems(ecosystem.packageManagers, fromRegistry.packageManagers);
  const frameworks = fromRegistry.frameworks;
  const integrations = fromRegistry.integrations;

  const stack: DetectedStack = {
    projectRoot,
    runtimes,
    packageManagers,
    frameworks,
    integrations,
    warnings: ecosystem.warnings,
  };
  if (ecosystem.language !== undefined) {
    stack.language = ecosystem.language;
  }

  return { ok: true, stack };
}

async function detectRegistryItems(
  registry: RegistryLookup,
  context: DetectionContext,
): Promise<{
  runtimes: DetectedItem[];
  packageManagers: DetectedItem[];
  frameworks: DetectedItem[];
  integrations: DetectedItem[];
}> {
  const runtimes: DetectedItem[] = [];
  const packageManagers: DetectedItem[] = [];
  const frameworks: DetectedItem[] = [];
  const integrations: DetectedItem[] = [];

  for (const definition of registry.list()) {
    if (definition.detect === undefined) {
      continue;
    }

    const result = await definition.detect(context);
    if (!result.detected) {
      continue;
    }

    const item: DetectedItem = {
      id: definition.id,
      name: definition.name,
      category: definition.category,
      confidence: result.confidence,
      evidence: result.evidence,
    };

    if (definition.category === "runtime") {
      runtimes.push(item);
    } else if (definition.category === "package-manager") {
      packageManagers.push(item);
    } else if (definition.category === "framework" || definition.category === "backend-framework") {
      frameworks.push(item);
    } else {
      integrations.push(item);
    }
  }

  return { runtimes, packageManagers, frameworks, integrations };
}

function mergeItems(ecosystem: DetectedItem[], fromRegistry: DetectedItem[]): DetectedItem[] {
  const byId = new Map<string, DetectedItem>();
  for (const item of ecosystem) {
    byId.set(item.id, item);
  }
  for (const item of fromRegistry) {
    const existing = byId.get(item.id);
    if (existing === undefined) {
      byId.set(item.id, item);
      continue;
    }

    byId.set(item.id, {
      ...item,
      evidence: uniqueEvidence([...existing.evidence, ...item.evidence]),
      confidence: item.confidence,
    });
  }

  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function uniqueEvidence(items: DetectedItem["evidence"]): DetectedItem["evidence"] {
  const seen = new Set<string>();
  const unique: DetectedItem["evidence"] = [];
  for (const item of items) {
    const key = `${item.kind}:${item.path ?? ""}:${item.detail}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }
  return unique;
}
