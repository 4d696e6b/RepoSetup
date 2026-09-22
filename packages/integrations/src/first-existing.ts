import type { DetectionFileSystem } from "@reposetup/core";

export async function firstExistingPath(
  files: DetectionFileSystem,
  candidates: readonly string[],
): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (await files.exists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
