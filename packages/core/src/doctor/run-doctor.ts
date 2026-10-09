import { createDetectionContext } from "../detection/context.js";
import { detectProject } from "../detection/detect-project.js";
import { createNodeDetectionFs } from "../detection/filesystem.js";
import type { DetectedItem } from "../detection/types.js";
import type { DetectedStack } from "../detection/types.js";
import type { ErrorCode } from "../errors/codes.js";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { VerificationContext } from "../integrations/definition.js";
import { presentItems } from "../planning/config-from-detected.js";
import { pathPrerequisite } from "../prerequisites/path.js";
import type { ExecutableResolver } from "../executor/types.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import type { RepoSetupConfig } from "../config/types.js";
import { parseRepoSetupConfig } from "../config/parse.js";
import { planInstallation } from "../planning/plan.js";
import { collectIntendedChecks } from "./intended-checks.js";
import type { DetectionConfidence, DetectionEvidence } from "../integrations/definition.js";

export interface DoctorCheck {
  id: string;
  name: string;
  ok: boolean;
  message: string;
  code?: ErrorCode;
  suggestion?: string;
  /** Informational differences do not fail doctor. */
  level?: "info";
  confidence?: DetectionConfidence;
  evidence?: DetectionEvidence[];
}

export interface DoctorResult {
  projectRoot: string;
  checks: DoctorCheck[];
  mode?: "intended";
}

export type RunDoctorResult =
  { ok: true; result: DoctorResult } | { ok: false; error: RepoSetupError };

export async function runDoctor(input: {
  startDir: string;
  registry: RegistryLookup;
  commandExists: (command: string) => Promise<boolean>;
  commandVersion?: (command: string) => Promise<string | undefined>;
  resolveExecutable?: ExecutableResolver;
  expectedConfig?: RepoSetupConfig;
  checkCommand?: (command: string, args: readonly string[]) => Promise<boolean>;
  checkInstalledDependencies?: (context: VerificationContext) => Promise<DoctorCheck[]>;
}): Promise<RunDoctorResult> {
  const parsedExpected =
    input.expectedConfig === undefined ? undefined : parseRepoSetupConfig(input.expectedConfig);
  if (parsedExpected !== undefined && !parsedExpected.success)
    return { ok: false, error: parsedExpected.error };
  const expectedConfig = parsedExpected?.success === true ? parsedExpected.config : undefined;
  if (expectedConfig !== undefined) {
    const planned = planInstallation(expectedConfig, input.registry);
    if (!planned.valid)
      return {
        ok: false,
        error:
          planned.errors[0] ??
          createRepoSetupError({
            code: "CONFIG_INVALID",
            message: "Intended stack cannot be resolved.",
          }),
      };
  }
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
    [
      ...presentItems(detected.stack.runtimes),
      ...presentItems(detected.stack.packageManagers),
      ...presentItems(detected.stack.integrations),
    ],
    input.commandExists,
    input.commandVersion,
    input.resolveExecutable,
    checks,
  );
  await collectComposePrerequisite(
    presentItems(detected.stack.integrations),
    input.checkCommand,
    checks,
  );
  if (input.checkInstalledDependencies !== undefined) {
    checks.push(...(await input.checkInstalledDependencies(detection)));
  }
  await collectLockfileConflicts(files, checks);
  await collectEnvironmentGuidance(files, checks);
  if (expectedConfig === undefined) {
    await collectVerifyChecks(
      [...presentItems(detected.stack.frameworks), ...presentItems(detected.stack.integrations)],
      input.registry,
      detection,
      checks,
    );
  }

  if (expectedConfig !== undefined) {
    await collectPathChecks(
      expectedOnlyPrerequisites(expectedConfig, detected.stack),
      input.commandExists,
      input.commandVersion,
      input.resolveExecutable,
      checks,
    );
    await collectIntendedRuntimeVersion(
      expectedConfig,
      input.commandVersion,
      input.resolveExecutable,
      checks,
    );
    checks.push(
      ...(await collectIntendedChecks({
        config: expectedConfig,
        stack: detected.stack,
        context: detection,
        registry: input.registry,
      })),
    );
  }

  return {
    ok: true,
    result: {
      projectRoot: detected.stack.projectRoot,
      checks,
      ...(expectedConfig === undefined ? {} : { mode: "intended" as const }),
    },
  };
}

async function collectIntendedRuntimeVersion(
  config: RepoSetupConfig,
  commandVersion: ((command: string) => Promise<string | undefined>) | undefined,
  resolveExecutable: ExecutableResolver | undefined,
  checks: DoctorCheck[],
): Promise<void> {
  if (config.runtime.version === undefined) return;
  const spec = pathPrerequisite(config.runtime.id);
  const command =
    spec === undefined
      ? undefined
      : resolveExecutable === undefined
        ? spec.command
        : await resolveExecutable(spec.command);
  const actual = command === undefined ? undefined : await commandVersion?.(command);
  const expectedParts = /^\d+(?:\.\d+){0,2}$/.test(config.runtime.version)
    ? config.runtime.version.split(".")
    : undefined;
  const actualParts =
    actual === undefined
      ? undefined
      : /(?:v|Python\s+)?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(actual)?.slice(1);
  const matches =
    expectedParts !== undefined &&
    actualParts !== undefined &&
    expectedParts.every((part, index) => part === actualParts[index]);
  checks.push({
    id: "intended-runtime-version",
    name: "Intended runtime version",
    ok: true,
    ...(matches ? {} : { level: "info" as const }),
    confidence: matches ? "likely" : "possible",
    evidence: [
      {
        kind: "config",
        detail: "Compared the intended runtime version with the local executable version.",
      },
    ],
    message: matches
      ? "The local runtime version matches the intended version prefix."
      : "The local runtime version differs from, or cannot be compared with, the intended version. Compatibility is not established by this check.",
  });
}

function expectedOnlyPrerequisites(config: RepoSetupConfig, stack: DetectedStack): DetectedItem[] {
  const detectedIds = new Set([...stack.runtimes, ...stack.packageManagers].map((item) => item.id));
  return [
    {
      id: config.runtime.id,
      name: config.runtime.id === "node" ? "Node.js" : "Python",
      category: "runtime" as const,
      confidence: "certain" as const,
      evidence: [],
    },
    {
      id: config.packageManager,
      name: config.packageManager,
      category: "package-manager" as const,
      confidence: "certain" as const,
      evidence: [],
    },
  ].filter((item) => !detectedIds.has(item.id));
}

async function collectComposePrerequisite(
  items: readonly DetectedItem[],
  checkCommand: ((command: string, args: readonly string[]) => Promise<boolean>) | undefined,
  checks: DoctorCheck[],
): Promise<void> {
  if (!items.some((item) => item.id === "docker-compose")) return;
  // A missing Docker CLI already has its own actionable prerequisite failure.
  if (checks.some((check) => check.id === "prerequisite:docker" && !check.ok)) return;

  const available =
    checkCommand === undefined ? false : await checkCommand("docker", ["compose", "version"]);
  checks.push({
    id: "prerequisite:docker-compose",
    name: "Docker Compose CLI",
    ok: available,
    message: available
      ? "docker compose is available. The Docker daemon and running containers were not checked."
      : "docker compose could not be verified. A Compose file does not install the Compose plugin.",
    ...(available
      ? {}
      : {
          code: "PREREQUISITE_MISSING" as const,
          suggestion:
            "Install Docker Compose from https://docs.docker.com/compose/install/ and confirm docker compose version succeeds. RepoSetup does not install it or start containers.",
        }),
  });
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
  resolveExecutable: ExecutableResolver | undefined,
  checks: DoctorCheck[],
): Promise<void> {
  for (const item of items) {
    const spec = pathPrerequisite(item.id);
    if (spec === undefined) {
      continue;
    }

    const command =
      resolveExecutable === undefined ? spec.command : await resolveExecutable(spec.command);
    if (command !== undefined && (await commandExists(command))) {
      const version =
        spec.minimumVersion === undefined ? undefined : await commandVersion?.(command);
      if (
        spec.minimumVersion !== undefined &&
        commandVersion !== undefined &&
        (version === undefined || isVersionBelow(version, spec.minimumVersion))
      ) {
        checks.push({
          id: `prerequisite:${item.id}`,
          name: item.name,
          ok: false,
          message: `${command} does not meet the required version ${formatVersion(spec.minimumVersion)} or later.`,
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
          version === undefined ? `${command} is on PATH.` : `${command} ${version} is on PATH.`,
      });
      continue;
    }

    checks.push({
      id: `prerequisite:${item.id}`,
      name: item.name,
      ok: false,
      message:
        item.id === "docker"
          ? "docker was not found on PATH or could not run docker --version."
          : `${spec.command} was not found on PATH.`,
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
        message: result.message ?? `${item.name} configuration looks healthy.`,
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
