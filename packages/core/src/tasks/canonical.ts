import { createHash } from "node:crypto";

const scalarSets = new Set([
  "requirementIds",
  "phaseCriterionIds",
  "taskIds",
  "taskCriterionIds",
  "requiredArtifactIds",
  "requiredCheckIds",
  "checkIds",
  "criterionIds",
  "modelProfileIds",
  "features",
  "inclusionReasons",
]);
const recordKeys: Record<string, readonly string[]> = {
  tasks: ["taskId"],
  dependencies: ["predecessorTaskId", "consumerTaskId"],
  coverage: ["requirementId"],
  outputs: ["artifactId"],
  providerAvailability: ["providerId"],
};
export function compareTaskIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Called on validated JSON records only. Ordered arrays preserve their semantic order. */
export function canonicalTaskValue(value: unknown, field = "", parent = ""): unknown {
  if (Array.isArray(value)) {
    const items: unknown[] = value.map((item: unknown) => canonicalTaskValue(item, "", field));
    if (
      scalarSets.has(field) ||
      field === "write" ||
      (field === "paths" && items.every((item) => typeof item === "string"))
    ) {
      return [...new Set(items as string[])].sort(compareTaskIds);
    }
    if ((parent === "scope" && ["read", "deny"].includes(field)) || field === "exclusions") {
      return items.sort((a, b) => compareTaskIds(selectorKey(a), selectorKey(b)));
    }
    const keys = recordKeys[field];
    if (keys !== undefined && items.every((item) => item !== null && typeof item === "object")) {
      return items.sort((a, b) => compareTaskIds(recordKey(a, keys), recordKey(b, keys)));
    }
    return items;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => compareTaskIds(a, b))
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, canonicalTaskValue(item, key, field)]),
    );
  }
  return value;
}
function recordKey(value: unknown, keys: readonly string[]): string {
  const record = value as Record<string, string>;
  return keys.map((key) => record[key]).join("\0");
}
function selectorKey(value: unknown): string {
  return recordKey(value, ["type", "path"]);
}
export function taskContentHash(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalTaskValue(value)))
    .digest("hex")}`;
}
export function freezeTaskValue<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeTaskValue(child);
    Object.freeze(value);
  }
  return value;
}
