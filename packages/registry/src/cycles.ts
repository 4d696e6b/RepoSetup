import type { IntegrationDefinition } from "@reposetup/core";

export function findRequirementCycles(definitions: readonly IntegrationDefinition[]): string[][] {
  const registeredIds = new Set(definitions.map((definition) => definition.id));
  const edges = new Map<string, string[]>();

  for (const definition of definitions) {
    const targets: string[] = [];
    for (const requirement of definition.requirements ?? []) {
      if (requirement.target.type === "integration" && registeredIds.has(requirement.target.id)) {
        targets.push(requirement.target.id);
      }
    }

    edges.set(
      definition.id,
      [...new Set(targets)].sort((left, right) => left.localeCompare(right)),
    );
  }

  const color = new Map<string, "white" | "gray" | "black">();
  for (const id of registeredIds) {
    color.set(id, "white");
  }

  const cycles = new Map<string, string[]>();
  const nodes = [...registeredIds].sort((left, right) => left.localeCompare(right));

  for (const node of nodes) {
    if (color.get(node) === "white") {
      visit(node, [node], edges, color, cycles);
    }
  }

  return [...cycles.values()];
}

function visit(
  node: string,
  path: string[],
  edges: Map<string, string[]>,
  color: Map<string, "white" | "gray" | "black">,
  cycles: Map<string, string[]>,
): void {
  color.set(node, "gray");

  for (const next of edges.get(node) ?? []) {
    const nextColor = color.get(next);

    if (nextColor === "gray") {
      const start = path.indexOf(next);
      const cycle = canonicalizeCycle([...path.slice(start), next]);
      cycles.set(cycle.join("\0"), cycle);
      continue;
    }

    if (nextColor === "white") {
      visit(next, [...path, next], edges, color, cycles);
    }
  }

  color.set(node, "black");
}

function canonicalizeCycle(cycle: string[]): string[] {
  const nodes = cycle[0] === cycle[cycle.length - 1] ? cycle.slice(0, -1) : cycle;
  if (nodes.length === 0) {
    return cycle;
  }

  let minIndex = 0;
  for (let index = 1; index < nodes.length; index += 1) {
    if (nodes[index]! < nodes[minIndex]!) {
      minIndex = index;
    }
  }

  const rotated = [...nodes.slice(minIndex), ...nodes.slice(0, minIndex)];
  return [...rotated, rotated[0]!];
}
