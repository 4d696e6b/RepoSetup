import type { RepoSetupError } from "@reposetup/core";
import type { IntegrationDefinition } from "@reposetup/core";

export function sortDefinitions(
  definitions: readonly IntegrationDefinition[],
): IntegrationDefinition[] {
  return [...definitions].sort((left, right) => left.id.localeCompare(right.id));
}

export function sortErrors(errors: readonly RepoSetupError[]): RepoSetupError[] {
  return [...errors].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    if (codeOrder !== 0) {
      return codeOrder;
    }

    const leftId = errorSubject(left);
    const rightId = errorSubject(right);
    const idOrder = leftId.localeCompare(rightId);
    if (idOrder !== 0) {
      return idOrder;
    }

    return left.message.localeCompare(right.message);
  });
}

function errorSubject(error: RepoSetupError): string {
  const details = error.details;
  if (details === undefined) {
    return "";
  }

  if (typeof details.integrationId === "string") {
    return details.integrationId;
  }

  if (typeof details.id === "string") {
    return details.id;
  }

  return "";
}
