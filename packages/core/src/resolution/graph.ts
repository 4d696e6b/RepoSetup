import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type { IntegrationDefinition } from "../integrations/definition.js";
import type { SelectedIntegration } from "./normalize.js";
import { categorySatisfiesRequirement } from "./requirements.js";

export type TopologicalSortResult =
  { ok: true; order: string[] } | { ok: false; error: RepoSetupError };

export function sortSelectedIntegrations(
  selected: readonly SelectedIntegration[],
  definitions: ReadonlyMap<string, IntegrationDefinition>,
): TopologicalSortResult {
  const nodes = selected.map((item) => item.id).filter((id) => definitions.has(id));
  const nodeSet = new Set(nodes);
  const incoming = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const id of nodes) {
    incoming.set(id, 0);
    dependents.set(id, []);
  }

  for (const id of nodes) {
    const definition = definitions.get(id);
    if (definition === undefined) {
      continue;
    }

    for (const prerequisite of prerequisitesFor(id, definition, selected, definitions, nodeSet)) {
      addEdge(prerequisite, id, incoming, dependents);
    }
  }

  const ready = nodes.filter((id) => incoming.get(id) === 0).sort(compareIds);
  const order: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift()!;
    order.push(current);

    for (const dependent of dependents.get(current) ?? []) {
      const nextCount = (incoming.get(dependent) ?? 0) - 1;
      incoming.set(dependent, nextCount);
      if (nextCount === 0) {
        ready.push(dependent);
        ready.sort(compareIds);
      }
    }
  }

  if (order.length !== nodes.length) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "DEPENDENCY_CYCLE",
        message: "Selected integrations contain a requirement cycle.",
        details: { remaining: nodes.filter((id) => !order.includes(id)).sort(compareIds) },
        suggestion: "Remove a requirement so the selected integrations form a DAG.",
      }),
    };
  }

  return { ok: true, order };
}

function prerequisitesFor(
  sourceId: string,
  definition: IntegrationDefinition,
  selected: readonly SelectedIntegration[],
  definitions: ReadonlyMap<string, IntegrationDefinition>,
  nodeSet: ReadonlySet<string>,
): string[] {
  const prerequisites = new Set<string>();

  for (const requirement of definition.requirements ?? []) {
    if (requirement.target.type === "integration") {
      if (requirement.target.id !== sourceId && nodeSet.has(requirement.target.id)) {
        prerequisites.add(requirement.target.id);
      }
      continue;
    }

    for (const item of selected) {
      if (item.id === sourceId || !nodeSet.has(item.id)) {
        continue;
      }

      const candidate = definitions.get(item.id);
      if (
        candidate !== undefined &&
        categorySatisfiesRequirement(requirement.target.category, candidate.category)
      ) {
        prerequisites.add(item.id);
      }
    }
  }

  return [...prerequisites];
}

function addEdge(
  from: string,
  to: string,
  incoming: Map<string, number>,
  dependents: Map<string, string[]>,
): void {
  const current = dependents.get(from) ?? [];
  if (current.includes(to)) {
    return;
  }

  current.push(to);
  dependents.set(from, current);
  incoming.set(to, (incoming.get(to) ?? 0) + 1);
}

function compareIds(left: string, right: string): number {
  return left.localeCompare(right);
}
