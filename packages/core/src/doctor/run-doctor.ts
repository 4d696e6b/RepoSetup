import { createDetectionContext } from "../detection/context.js";
import { detectProject } from "../detection/detect-project.js";
import { createNodeDetectionFs } from "../detection/filesystem.js";
import type { DetectedItem } from "../detection/types.js";
import type { ErrorCode } from "../errors/codes.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { VerificationContext } from "../integrations/definition.js";
import { presentItems } from "../planning/config-from-detected.js";
import { pathPrerequisite } from "../prerequisites/path.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

export interface DoctorCheck {
  id: string;
  name: string;
  ok: boolean;
  message: string;
  code?: ErrorCode;
  suggestion?: string;
}

export interface DoctorResult {
  projectRoot: string;
  checks: DoctorCheck[];
}

export type RunDoctorResult =
  { ok: true; result: DoctorResult } | { ok: false; error: RepoSetupError };

export async function runDoctor(input: {
  startDir: string;
  registry: RegistryLookup;
  commandExists: (command: string) => Promise<boolean>;
  commandVersion?: (command: string) => Promise<string | undefined>;
}): Promise<RunDoctorResult> {
  const detected = await detectProject({
    startDir: input.startDir,
    registry: input.registry,
  });
  if (!detected.ok) {
    return detected;
  }

  const files = createNodeDetectionFs(detected.stack.projectRoot);
  const detection = await createDetectionContext(detected.stack.projectRoot, files);
  const checks: DoctorCheck[] = [];
  await collectPathChecks(
    [...presentItems(detected.stack.runtimes), ...presentItems(detected.stack.packageManagers)],
    input.commandExists,
    input.commandVersion,
    checks,
  );
  await collectLockfileConflicts(files, checks);
  await collectEnvironmentGuidance(files, checks);
  await collectVerifyChecks(
    [...presentItems(detected.stack.frameworks), ...presentItems(detected.stack.integrations)],
    input.registry,
    detection,
    checks,
  );

  return {
    ok: true,
    result: {
      projectRoot: detected.stack.projectRoot,
      checks,
    },
  };
}

export function failedDoctorChecks(result: DoctorResult): DoctorCheck[] {
  return result.checks.filter((check) => !check.ok);
}

export function errorsFromDoctor(result: DoctorResult): RepoSetupError[] {
  return failedDoctorChecks(result).map((check) =>
    createRepoSetupError({
      code: check.code ?? "VERIFICATION_FAILED",
      message: check.message,
      details: { checkId: check.id, name: check.name },
      ...(check.suggestion === undefined ? {} : { suggestion: check.suggestion }),
    }),
  );
}

async function collectPathChecks(
  items: readonly DetectedItem[],
  commandExists: (command: string) => Promise<boolean>,
  commandVersion: ((command: string) => Promise<string | undefined>) | undefined,
  checks: DoctorCheck[],
): Promise<void> {
  for (const item of items) {
    const spec = pathPrerequisite(item.id);
    if (spec === undefined) {
      continue;
    }

    if (await commandExists(spec.command)) {
      const version =
        spec.minimumVersion === undefined ? undefined : await commandVersion?.(spec.command);
      if (
        spec.minimumVersion !== undefined &&
        commandVersion !== undefined &&
        (version === undefined || isVersionBelow(version, spec.minimumVersion))
      ) {
        checks.push({
          id: `prerequisite:${item.id}`,
          name: item.name,
          ok: false,
          message: `${spec.command} does not meet the required version ${formatVersion(spec.minimumVersion)} or later.`,
          code: "PREREQUISITE_MISSING",
          suggestion: spec.hint,
        });
        continue;
      }
      checks.push({
        id: `prerequisite:${item.id}`,
        name: item.name,
        ok: true,
        message:
          version === undefined
            ? `${spec.command} is on PATH.`
            : `${spec.command} ${version} is on PATH.`,
      });
      continue;
    }

    checks.push({
      id: `prerequisite:${item.id}`,
      name: item.name,
      ok: false,
      message: `${spec.command} was not found on PATH.`,
      code: "PREREQUISITE_MISSING",
      suggestion: spec.hint,
    });
  }
}

async function collectLockfileConflicts(
  files: ReturnType<typeof createNodeDetectionFs>,
  checks: DoctorCheck[],
): Promise<void> {
  const lockfiles = [
    "pnpm-lock.yaml",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "bun.lock",
    "bun.lockb",
  ];
  const found: string[] = [];
  for (const lockfile of lockfiles) {
    if (await files.exists(lockfile)) {
      found.push(lockfile);
    }
  }
  if (found.length > 1) {
    checks.push({
      id: "lockfiles",
      name: "Node package-manager lockfiles",
      ok: false,
      message: `Conflicting Node lockfiles found: ${found.join(", ")}.`,
      code: "CONFIG_INVALID",
      suggestion:
        "Keep the lockfile for the package manager you intend to use, then remove the others deliberately.",
    });
  }
}

async function collectEnvironmentGuidance(
  files: ReturnType<typeof createNodeDetectionFs>,
  checks: DoctorCheck[],
): Promise<void> {
  if ((await files.exists(".env")) && !(await files.exists(".env.example"))) {
    checks.push({
      id: "environment-example",
      name: "Environment variable guidance",
      ok: false,
      message: "Found .env but no .env.example placeholder file.",
      code: "VERIFICATION_FAILED",
      suggestion:
        "Create .env.example with placeholder values only. Do not copy real secrets into it.",
    });
  }
}

async function collectVerifyChecks(
  items: readonly DetectedItem[],
  registry: RegistryLookup,
  context: VerificationContext,
  checks: DoctorCheck[],
): Promise<void> {
  for (const item of items) {
    const definition = registry.get(item.id);
    if (definition?.verify === undefined) {
      continue;
    }

    const result = await definition.verify(context);
    if (result.ok) {
      checks.push({
        id: item.id,
        name: item.name,
        ok: true,
        message: result.message ?? `${item.name} looks healthy.`,
      });
      continue;
    }

    checks.push({
      id: item.id,
      name: item.name,
      ok: false,
      message: result.message ?? `${item.name} verification failed.`,
      code: "VERIFICATION_FAILED",
      ...(result.suggestion === undefined ? {} : { suggestion: result.suggestion }),
    });
  }
}

function isVersionBelow(version: string, minimum: readonly [number, number, number]): boolean {
  const parsed = /(?:v|Python\s+)?(\d+)\.(\d+)(?:\.(\d+))?/.exec(version);
  if (parsed === null) return true;
  const actual: [number, number, number] = [
    Number(parsed[1]),
    Number(parsed[2]),
    Number(parsed[3] ?? "0"),
  ];
  const [actualMajor, actualMinor, actualPatch] = actual;
  const [minimumMajor, minimumMinor, minimumPatch] = minimum;
  return (
    actualMajor < minimumMajor ||
    (actualMajor === minimumMajor &&
      (actualMinor < minimumMinor || (actualMinor === minimumMinor && actualPatch < minimumPatch)))
  );
}

function formatVersion(version: readonly [number, number, number]): string {
  return version.join(".");
}
