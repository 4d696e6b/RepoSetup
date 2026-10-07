import type { InstallationOperation } from "@reposetup/core";

export function requireNodeRange(versionRange: string, reason: string): InstallationOperation {
  return {
    type: "check_prerequisite",
    id: "node",
    versionRange,
    description: `Require Node.js ${versionRange} (${reason}).`,
  };
}
