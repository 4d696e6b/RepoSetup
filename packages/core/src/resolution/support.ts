import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { IntegrationDefinition, SupportContext } from "../integrations/definition.js";
import type { SelectedIntegration } from "./normalize.js";

export function collectUnsupportedContexts(
  selected: readonly SelectedIntegration[],
  definitions: ReadonlyMap<string, IntegrationDefinition>,
  context: SupportContext,
): RepoSetupError[] {
  const errors: RepoSetupError[] = [];

  for (const item of selected) {
    const definition = definitions.get(item.id);
    if (definition === undefined) {
      continue;
    }

    const support = definition.supports(context);
    if (support.supported) {
      continue;
    }

    const details: Record<string, unknown> = { integrationId: item.id };
    if (support.reason !== undefined) {
      details.reason = support.reason;
    }

    errors.push(
      createRepoSetupError({
        code: "UNSUPPORTED_CONTEXT",
        message:
          support.reason === undefined
            ? `Integration "${item.id}" does not support this project context.`
            : `Integration "${item.id}" does not support this project context: ${support.reason}`,
        details,
        suggestion: "Choose a compatible runtime, package manager, or framework.",
      }),
    );
  }

  return errors;
}
