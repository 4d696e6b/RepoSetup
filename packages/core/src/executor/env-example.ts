import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";

const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function validateEnvEntry(key: string, placeholder: string): RepoSetupError | undefined {
  if (!ENV_KEY.test(key)) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: `Environment example key "${key}" is not a valid identifier.`,
      details: { key },
      suggestion: "Use a name matching [A-Za-z_][A-Za-z0-9_]*.",
    });
  }

  if (placeholder.includes("\0") || placeholder.includes("\n") || placeholder.includes("\r")) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: `Environment example placeholder for "${key}" contains a newline or NUL.`,
      details: { key },
      suggestion: "Keep .env.example placeholders on a single line.",
    });
  }

  return undefined;
}

export function existingEnvKeys(content: string): Set<string> {
  const keys = new Set<string>();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    keys.add(trimmed.slice(0, separator));
  }

  return keys;
}

export function formatEnvLine(key: string, placeholder: string): string {
  return `${key}=${placeholder}`;
}

export function appendEnvLines(existing: string, lines: readonly string[]): string {
  if (lines.length === 0) {
    return existing;
  }

  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  return `${prefix}${lines.join("\n")}\n`;
}
