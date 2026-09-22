import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { installationOperationSchema } from "../operations/schema.js";
import type { InstallationOperation } from "../operations/types.js";
import { sortResolutionErrors } from "../resolution/sort.js";

export interface PlanValidationResult {
  valid: boolean;
  operations: InstallationOperation[];
  errors: RepoSetupError[];
}

export function validateInstallationPlan(operations: readonly unknown[]): PlanValidationResult {
  const errors: RepoSetupError[] = [];
  const parsed: InstallationOperation[] = [];

  for (const [index, operation] of operations.entries()) {
    const result = installationOperationSchema.safeParse(operation);
    if (!result.success) {
      errors.push(
        createRepoSetupError({
          code: "PLAN_INVALID",
          message: `Installation operation ${index} is not a typed RepoSetup operation.`,
          details: {
            index,
            issues: result.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
          suggestion: "Integrations must emit a discriminated operation with command/args arrays.",
        }),
      );
      continue;
    }

    parsed.push(omitUndefinedFields(result.data) as InstallationOperation);
  }

  const sorted = sortResolutionErrors(errors);
  return {
    valid: sorted.length === 0,
    operations: sorted.length === 0 ? parsed : [],
    errors: sorted,
  };
}

function omitUndefinedFields<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
