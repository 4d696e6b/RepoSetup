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
    checks,
  );
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
  checks: DoctorCheck[],
): Promise<void> {
  for (const item of items) {
    const spec = pathPrerequisite(item.id);
    if (spec === undefined) {
      continue;
    }

    if (await commandExists(spec.command)) {
      checks.push({
        id: `prerequisite:${item.id}`,
        name: item.name,
        ok: true,
        message: `${spec.command} is on PATH.`,
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
