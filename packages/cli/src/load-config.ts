import path from "node:path";

import { createRepoSetupError, parseRepoSetupConfig, type RepoSetupConfig } from "@reposetup/core";

import type { CliFs } from "./types.js";

export type LoadConfigResult =
  | { ok: true; config: RepoSetupConfig }
  | { ok: false; error: ReturnType<typeof createRepoSetupError> };

export async function loadRepoSetupConfigFile(
  configPath: string,
  deps: { fs: CliFs; cwd: string },
): Promise<LoadConfigResult> {
  const resolvedPath = path.resolve(deps.cwd, configPath);

  let raw: string;
  try {
    raw = await deps.fs.readFile(resolvedPath);
  } catch {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "CONFIG_INVALID",
        message: `Could not read config file "${configPath}".`,
        details: { path: resolvedPath },
        suggestion: "Pass --config with a path to an existing JSON file.",
      }),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "CONFIG_INVALID",
        message: `Config file "${configPath}" is not valid JSON.`,
        details: { path: resolvedPath },
        suggestion: "Fix the JSON syntax and try again.",
      }),
    };
  }

  const result = parseRepoSetupConfig(parsed);
  if (!result.success) {
    return { ok: false, error: result.error };
  }

  return { ok: true, config: result.config };
}
