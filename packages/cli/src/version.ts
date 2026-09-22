import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "reposetup-cli";

export function cliVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "..", "package.json"),
    path.join(here, "package.json"),
    path.join(here, "..", "..", "package.json"),
  ];

  for (const file of candidates) {
    if (!existsSync(file)) {
      continue;
    }

    try {
      const pkg = JSON.parse(readFileSync(file, "utf8")) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === PACKAGE_NAME && typeof pkg.version === "string" && pkg.version.length > 0) {
        return pkg.version;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return "0.0.0";
}
