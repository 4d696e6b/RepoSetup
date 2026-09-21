import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";

export function parseJsonObject(
  content: string,
  filePath: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: RepoSetupError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "FILE_MUTATION_FAILED",
        message: `JSON file "${filePath}" is not valid JSON.`,
        details: { path: filePath, reason: error instanceof Error ? error.message : "parse error" },
        suggestion: "Fix the JSON file so RepoSetup can merge into an object.",
      }),
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "FILE_MUTATION_FAILED",
        message: `JSON file "${filePath}" must contain an object.`,
        details: { path: filePath },
        suggestion: "Use a JSON object so keys can be merged.",
      }),
    };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}

export function mergeJsonObjects(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    const current = result[key];
    if (isPlainObject(value) && isPlainObject(current)) {
      result[key] = mergeJsonObjects(current, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function stringifyJson(value: Record<string, unknown>): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
