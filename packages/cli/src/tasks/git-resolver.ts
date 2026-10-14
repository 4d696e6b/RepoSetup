import { access, lstat, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
/** Read-only resolution. Git probes run exclusively inside the core executor. */
export async function resolveTaskGitExecutable(): Promise<string | undefined> {
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!path.isAbsolute(directory)) continue;
    try {
      const candidate = await realpath(path.join(directory, "git"));
      const file = await lstat(candidate);
      if (!file.isFile() || file.isSymbolicLink()) continue;
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* Missing PATH entries do not cause process probes. */
    }
  }
  return undefined;
}
