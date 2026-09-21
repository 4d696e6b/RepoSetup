import type { DoctorResult } from "@reposetup/core";

import type { GlobalCliOptions } from "./types.js";

export function renderDoctor(result: DoctorResult, options: GlobalCliOptions): string {
  const failed = result.checks.filter((check) => !check.ok);
  const lines: string[] = [];

  if (!options.quiet) {
    lines.push("Doctor");
    if (options.verbose) {
      lines.push(`Project root  ${result.projectRoot}`);
    }
  }

  const names = result.checks.map((check) => check.name);
  const width = names.length === 0 ? 0 : Math.max(...names.map((name) => name.length));

  for (const check of result.checks) {
    if (options.quiet && check.ok) {
      continue;
    }

    const status = check.ok ? "ok  " : "fail";
    const name = width === 0 ? check.name : check.name.padEnd(width);
    const identity = options.verbose ? ` [${check.id}]` : "";
    lines.push(`  ${status}  ${name}${identity}  ${check.message}`);
    if (!check.ok && check.suggestion !== undefined) {
      lines.push(`        Suggestion: ${check.suggestion}`);
    }
  }

  if (options.quiet) {
    return lines.join("\n");
  }

  if (failed.length === 0) {
    lines.push("", "Doctor passed.");
  } else {
    const noun = failed.length === 1 ? "issue" : "issues";
    lines.push("", `Doctor found ${failed.length} ${noun}.`);
  }

  return lines.join("\n");
}
