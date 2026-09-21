import { access } from "node:fs/promises";
import path from "node:path";

export const PROJECT_ROOT_MARKERS = [
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "pnpm-workspace.yaml",
  "pyproject.toml",
  "uv.lock",
  "requirements.txt",
  "reposetup.json",
] as const;

export async function findProjectRoot(startDir: string): Promise<string | undefined> {
  let directory = path.resolve(startDir);
  const { root } = path.parse(directory);

  while (true) {
    for (const marker of PROJECT_ROOT_MARKERS) {
      if (await pathExists(path.join(directory, marker))) {
        return directory;
      }
    }

    if (directory === root) {
      return undefined;
    }

    directory = path.dirname(directory);
  }
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
