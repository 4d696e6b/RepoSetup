import type { RepoSetupConfig } from "../config/types.js";
import type {
  DetectionContext,
  DetectionEvidence,
  PackageJsonSummary,
} from "../integrations/definition.js";
import type { DetectedItem, DetectedStack } from "../detection/types.js";
import { presentItems } from "../planning/config-from-detected.js";
import { planInstallationSubset } from "../planning/plan.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import { pythonDistributionName, textDeclaresPythonPackage } from "../detection/python-package.js";
import type { DoctorCheck } from "./run-doctor.js";

const declaredEvidence: DetectionEvidence = {
  kind: "config",
  detail: "Declared in the schemaVersion 1 intended-stack config.",
};

export async function collectIntendedChecks(input: {
  config: RepoSetupConfig;
  stack: DetectedStack;
  context: DetectionContext;
  registry: RegistryLookup;
}): Promise<DoctorCheck[]> {
  const { config, stack, context, registry } = input;
  const checks: DoctorCheck[] = [];
  compareContext(config.runtime.id, stack.runtimes, "runtime", checks);
  compareContext(config.packageManager, stack.packageManagers, "package manager", checks);
  compareContext(config.framework.id, stack.frameworks, "framework", checks);
  if (config.framework.options?.typescript === true) {
    const present = stack.language?.id === "typescript";
    checks.push({
      id: "intended-context:typescript",
      name: "Intended TypeScript",
      ok: present,
      ...(present ? {} : { code: "INTENDED_CONTEXT_MISMATCH" as const }),
      confidence: stack.language?.confidence ?? "certain",
      evidence: [declaredEvidence, ...(stack.language?.evidence ?? [])],
      message: present
        ? "TypeScript evidence matches the intended framework option."
        : "The intended framework enables TypeScript, but no tsconfig or TypeScript dependency was found.",
      ...(present
        ? {}
        : {
            suggestion:
              "Check the selected project and restore its TypeScript configuration deliberately.",
          }),
    });
  }

  const expectedIds = [
    ...new Set([config.framework.id, ...config.integrations.map((item) => item.id)]),
  ];
  const expected = new Set(expectedIds);
  for (const id of expectedIds) {
    const definition = registry.get(id);
    if (definition === undefined) continue; // planInstallation rejects unknown IDs first.
    const found = [...stack.frameworks, ...stack.integrations].find((item) => item.id === id);
    if (definition.verify === undefined) {
      checks.push({
        id: `intended:${id}`,
        name: definition.name,
        ok: true,
        level: "info",
        confidence: "possible",
        evidence: [declaredEvidence],
        message:
          "No registry verification is available for this intended integration; inspect it manually.",
      });
    } else {
      const verified = await definition.verify(context);
      checks.push({
        id: `intended:${id}`,
        name: definition.name,
        ok: verified.ok,
        ...(verified.ok ? {} : { code: "INTENDED_VERIFICATION_FAILED" as const }),
        confidence: found?.confidence ?? "certain",
        evidence: [declaredEvidence, ...(found?.evidence ?? [])],
        message:
          verified.message ??
          (verified.ok
            ? `${definition.name} passes its registry verification.`
            : `${definition.name} failed its registry verification.`),
        ...(verified.suggestion === undefined ? {} : { suggestion: verified.suggestion }),
      });
    }
  }

  await compareDependencies({ config, context, registry, expectedIds, checks });

  for (const item of presentItems([...stack.frameworks, ...stack.integrations])) {
    if (expected.has(item.id)) continue;
    checks.push({
      id: `extra:${item.id}`,
      name: item.name,
      ok: true,
      level: "info",
      confidence: item.confidence,
      evidence: item.evidence,
      message: `${item.name} is detected locally but is not in the intended config. No removal is proposed.`,
    });
  }
  return checks;
}

function compareContext(
  expected: string,
  detected: readonly DetectedItem[],
  label: string,
  checks: DoctorCheck[],
): void {
  const present = presentItems(detected);
  const match = present.find((item) => item.id === expected);
  const conflicts = present.filter((item) => item.id !== expected);
  if (conflicts.length > 0 || (match === undefined && label !== "package manager")) {
    checks.push({
      id: `intended-context:${label.replaceAll(" ", "-")}`,
      name: `Intended ${label}`,
      ok: false,
      code: "INTENDED_CONTEXT_MISMATCH",
      confidence: conflicts.length > 0 ? (conflicts[0]?.confidence ?? "likely") : "certain",
      evidence: [declaredEvidence, ...present.flatMap((item) => item.evidence)],
      message: `Expected ${label} ${expected}; observed ${present.length === 0 ? "no supported evidence" : present.map((item) => item.id).join(", ")}.`,
      suggestion:
        "Use a config for the actual project or inspect the conflicting local evidence. Doctor makes no changes.",
    });
  } else if (match === undefined) {
    checks.push({
      id: "intended-context:package-manager",
      name: "Intended package manager",
      ok: true,
      level: "info",
      confidence: "possible",
      evidence: [declaredEvidence],
      message: `No local lockfile or manager declaration confirms ${expected}.`,
    });
  } else {
    checks.push({
      id: `intended-context:${label.replaceAll(" ", "-")}`,
      name: `Intended ${label}`,
      ok: true,
      confidence: match.confidence,
      evidence: [declaredEvidence, ...match.evidence],
      message: `${expected} matches the intended ${label}.`,
    });
  }
}

async function compareDependencies(input: {
  config: RepoSetupConfig;
  context: DetectionContext;
  registry: RegistryLookup;
  expectedIds: readonly string[];
  checks: DoctorCheck[];
}): Promise<void> {
  const seen = new Set<string>();
  const pythonManifest =
    input.config.runtime.id === "python"
      ? `${(await input.context.files.readText("pyproject.toml")) ?? ""}\n${(await input.context.files.readText("requirements.txt")) ?? ""}`
      : "";
  for (const id of input.expectedIds) {
    const planned = planInstallationSubset(input.config, input.registry, [id]);
    if (!planned.valid) continue; // Already rejected by the full plan.
    for (const operation of planned.operations) {
      if (operation.type !== "install_package") continue;
      for (const spec of operation.packages) {
        const packageSpec =
          operation.packageManager === "uv" || operation.packageManager === "pip"
            ? pythonSpec(spec)
            : nodeSpec(spec);
        if (packageSpec === undefined || seen.has(packageSpec.name)) continue;
        seen.add(packageSpec.name);
        const observed =
          input.config.runtime.id === "python"
            ? declaredPythonSpec(pythonManifest, packageSpec.name)
            : declaredNodeSpec(input.context.packageJson, packageSpec.name);
        const manifest =
          input.config.runtime.id === "python"
            ? "pyproject.toml or requirements.txt"
            : "package.json";
        const evidence: DetectionEvidence[] = [
          declaredEvidence,
          {
            kind: "manifest",
            detail: `Checked ${manifest} dependency declarations.`,
            path: input.config.runtime.id === "python" ? "pyproject.toml" : "package.json",
          },
        ];
        if (observed === undefined) {
          input.checks.push({
            id: `intended-dependency:${packageSpec.name}`,
            name: packageSpec.name,
            ok: false,
            code: "INTENDED_DEPENDENCY_MISSING",
            confidence: "certain",
            evidence,
            message: `${manifest} does not declare intended dependency ${packageSpec.name}.`,
            suggestion: `Add ${packageSpec.name} deliberately; doctor will not install it.`,
          });
        } else if (
          packageSpec.version !== undefined &&
          !matchesRecipePin(observed, packageSpec.version)
        ) {
          input.checks.push({
            id: `intended-version:${packageSpec.name}`,
            name: packageSpec.name,
            ok: true,
            level: "info",
            confidence: "certain",
            evidence,
            message: `${packageSpec.name} declares a version or range different from the registry recipe pin ${packageSpec.version}; compatibility is not established by this check.`,
          });
        } else {
          input.checks.push({
            id: `intended-dependency:${packageSpec.name}`,
            name: packageSpec.name,
            ok: true,
            confidence: "certain",
            evidence,
            message: `${manifest} declares ${packageSpec.name}; installation and runtime behavior are not proven by the declaration.`,
          });
        }
      }
    }
  }
}

function nodeSpec(spec: string): { name: string; version?: string } | undefined {
  const at = spec.lastIndexOf("@");
  if (at < 1) return spec.length > 0 ? { name: spec } : undefined;
  return { name: spec.slice(0, at), version: spec.slice(at + 1) };
}

function pythonSpec(spec: string): { name: string; version?: string } | undefined {
  const name = pythonDistributionName(spec);
  if (name.length === 0) return undefined;
  const exact = /==([^;\s]+)/.exec(spec);
  return { name, ...(exact === null ? {} : { version: exact[1] }) };
}

function declaredNodeSpec(pkg: PackageJsonSummary | undefined, name: string): string | undefined {
  if (pkg === undefined) return undefined;
  return (
    pkg.dependencies[name] ??
    pkg.devDependencies[name] ??
    pkg.optionalDependencies[name] ??
    pkg.peerDependencies[name]
  );
}

function declaredPythonSpec(text: string, name: string): string | undefined {
  if (!textDeclaresPythonPackage(text, name)) return undefined;
  for (const candidate of [...text.matchAll(/["']([^"'\r\n]{1,160})["']/g)].map(
    (match) => match[1] ?? "",
  )) {
    if (pythonDistributionName(candidate) === name) return versionPart(candidate);
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#") && pythonDistributionName(trimmed) === name)
      return versionPart(trimmed);
  }
  return name;
}

function versionPart(spec: string): string {
  const marker = spec.search(/[<>=!~]/);
  return marker === -1 ? "" : (spec.slice(marker).split(/[;\s#]/, 1)[0] ?? "");
}

function matchesRecipePin(observed: string, expected: string): boolean {
  return (
    observed === expected ||
    observed === `==${expected}` ||
    observed === `^${expected}` ||
    observed === `~${expected}`
  );
}
