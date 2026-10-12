import path from "node:path";
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
  const creates = new Map<string, { index: number; exclusive: boolean }>();

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

    const typed = omitUndefinedFields(result.data) as InstallationOperation;
    if (typed.type === "create_file") {
      const target = path.posix.normalize(typed.path.replaceAll("\\", "/"));
      const previous = creates.get(target);
      if (previous !== undefined && (previous.exclusive || typed.behavior === "fail_if_exists")) {
        errors.push(
          createRepoSetupError({
            code: "PLAN_INVALID",
            message: "Multiple file creation operations conflict with an exclusive target.",
            details: { path: target, index, previousIndex: previous.index },
            suggestion: "Give the generated file one integration owner before executing the plan.",
          }),
        );
      }
      creates.set(target, { index, exclusive: typed.behavior === "fail_if_exists" });
    }
    parsed.push(typed);
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
