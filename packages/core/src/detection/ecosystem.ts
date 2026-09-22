import type { IntegrationCategory } from "../categories/integration-category.js";
import type { DetectionContext, DetectionEvidence } from "../integrations/definition.js";

import { firstExistingPath, packageJsonFrom } from "./context.js";
import { hasPackageDependency } from "./package-json.js";
import { evidence } from "./result.js";
import type { DetectedItem, DetectedLanguage } from "./types.js";

const NODE_LOCKFILES = [
  { path: "pnpm-lock.yaml", id: "pnpm", name: "pnpm" },
  { path: "package-lock.json", id: "npm", name: "npm" },
  { path: "npm-shrinkwrap.json", id: "npm", name: "npm" },
  { path: "bun.lock", id: "bun", name: "Bun" },
  { path: "bun.lockb", id: "bun", name: "Bun" },
] as const;

const PACKAGE_MANAGER_FIELD_PREFIXES = [
  { prefix: "pnpm@", id: "pnpm", name: "pnpm" },
  { prefix: "npm@", id: "npm", name: "npm" },
  { prefix: "bun@", id: "bun", name: "Bun" },
] as const;

export interface EcosystemDetection {
  runtimes: DetectedItem[];
  packageManagers: DetectedItem[];
  language?: DetectedLanguage;
  warnings: string[];
}

export async function detectEcosystem(context: DetectionContext): Promise<EcosystemDetection> {
  const runtimes = new Map<string, DetectedItem>();
  const packageManagers = new Map<string, DetectedItem>();
  const warnings: string[] = [];

  const pkg = await packageJsonFrom(context);
  if (pkg !== undefined) {
    addItem(runtimes, {
      id: "node",
      name: "Node.js",
      category: "runtime",
      confidence: "certain",
      evidence: [evidence("manifest", "Found package.json", "package.json")],
    });
  }

  const pythonEvidence: DetectionEvidence[] = [];
  for (const marker of ["pyproject.toml", "uv.lock", "requirements.txt"] as const) {
    if (await context.files.exists(marker)) {
      pythonEvidence.push(evidence("manifest", `Found ${marker}`, marker));
    }
  }
  if (pythonEvidence.length > 0) {
    addItem(runtimes, {
      id: "python",
      name: "Python",
      category: "runtime",
      confidence: "certain",
      evidence: pythonEvidence,
    });
  }

  for (const lockfile of NODE_LOCKFILES) {
    if (await context.files.exists(lockfile.path)) {
      addItem(packageManagers, {
        id: lockfile.id,
        name: lockfile.name,
        category: "package-manager",
        confidence: "certain",
        evidence: [evidence("lockfile", `Found ${lockfile.path}`, lockfile.path)],
      });
    }
  }

  if (await context.files.exists("yarn.lock")) {
    warnings.push(
      "Found yarn.lock; RepoSetup v1 does not treat Yarn as a package manager, so it is not selected from a global tool either.",
    );
  }

  if (pkg?.packageManager !== undefined) {
    const field = pkg.packageManager;
    const matched = PACKAGE_MANAGER_FIELD_PREFIXES.find((candidate) =>
      field.startsWith(candidate.prefix),
    );
    if (matched !== undefined) {
      addItem(packageManagers, {
        id: matched.id,
        name: matched.name,
        category: "package-manager",
        confidence: "certain",
        evidence: [
          evidence("manifest", `package.json packageManager field is ${field}`, "package.json"),
        ],
      });
    } else if (field.startsWith("yarn@")) {
      warnings.push(
        `package.json declares packageManager ${field}; Yarn is not a v1 RepoSetup package manager.`,
      );
    }
  }

  if ((await context.files.exists("pnpm-workspace.yaml")) && !packageManagers.has("pnpm")) {
    addItem(packageManagers, {
      id: "pnpm",
      name: "pnpm",
      category: "package-manager",
      confidence: "likely",
      evidence: [evidence("config", "Found pnpm-workspace.yaml", "pnpm-workspace.yaml")],
    });
  }

  if (await context.files.exists("uv.lock")) {
    addItem(packageManagers, {
      id: "uv",
      name: "uv",
      category: "package-manager",
      confidence: "certain",
      evidence: [evidence("lockfile", "Found uv.lock", "uv.lock")],
    });
  } else {
    const pyproject = await context.files.readText("pyproject.toml");
    if (pyproject !== undefined && /\[tool\.uv\b/.test(pyproject)) {
      addItem(packageManagers, {
        id: "uv",
        name: "uv",
        category: "package-manager",
        confidence: "likely",
        evidence: [evidence("config", "pyproject.toml declares [tool.uv]", "pyproject.toml")],
      });
    }
  }

  if ((await context.files.exists("requirements.txt")) && !packageManagers.has("uv")) {
    addItem(packageManagers, {
      id: "pip",
      name: "pip",
      category: "package-manager",
      confidence: "likely",
      evidence: [evidence("file", "Found requirements.txt", "requirements.txt")],
    });
  }

  const language = await detectLanguage(context, pkg);

  const result: EcosystemDetection = {
    runtimes: sortItems([...runtimes.values()]),
    packageManagers: sortItems([...packageManagers.values()]),
    warnings,
  };
  if (language !== undefined) {
    result.language = language;
  }
  return result;
}

async function detectLanguage(
  context: DetectionContext,
  pkg: Awaited<ReturnType<typeof packageJsonFrom>>,
): Promise<DetectedLanguage | undefined> {
  const tsconfig = await firstExistingPath(context.files, ["tsconfig.json", "tsconfig.base.json"]);
  const hasTypescriptDep = pkg !== undefined && hasPackageDependency(pkg, "typescript");
  if (tsconfig !== undefined || hasTypescriptDep) {
    const evidenceItems: DetectionEvidence[] = [];
    if (tsconfig !== undefined) {
      evidenceItems.push(evidence("config", `Found ${tsconfig}`, tsconfig));
    }
    if (hasTypescriptDep) {
      evidenceItems.push(
        evidence("dependency", "package.json includes typescript", "package.json"),
      );
    }
    return { id: "typescript", confidence: "certain", evidence: evidenceItems };
  }

  if (await context.files.exists("jsconfig.json")) {
    return {
      id: "javascript",
      confidence: "likely",
      evidence: [evidence("config", "Found jsconfig.json", "jsconfig.json")],
    };
  }

  return undefined;
}

function addItem(items: Map<string, DetectedItem>, next: DetectedItem): void {
  const existing = items.get(next.id);
  if (existing === undefined) {
    items.set(next.id, next);
    return;
  }

  items.set(next.id, {
    ...existing,
    confidence: higherConfidence(existing.confidence, next.confidence),
    evidence: [...existing.evidence, ...next.evidence],
  });
}

function higherConfidence(
  left: DetectedItem["confidence"],
  right: DetectedItem["confidence"],
): DetectedItem["confidence"] {
  const rank = { possible: 0, likely: 1, certain: 2 };
  return rank[left] >= rank[right] ? left : right;
}

function sortItems(items: DetectedItem[]): DetectedItem[] {
  return items.sort((left, right) => {
    const category = categoryRank(left.category) - categoryRank(right.category);
    if (category !== 0) {
      return category;
    }
    return left.id.localeCompare(right.id);
  });
}

function categoryRank(category: IntegrationCategory): number {
  if (category === "runtime") {
    return 0;
  }
  if (category === "package-manager") {
    return 1;
  }
  return 2;
}
