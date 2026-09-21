import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { DetectionFileSystem } from "../integrations/definition.js";
import { isSafeProjectRelativePath } from "../paths/project-path.js";

export function createNodeDetectionFs(projectRoot: string): DetectionFileSystem {
  const root = path.resolve(projectRoot);

  return {
    async exists(relativePath) {
      const absolute = resolveSafe(root, relativePath);
      if (absolute === undefined) {
        return false;
      }

      try {
        await access(absolute);
        return true;
      } catch {
        return false;
      }
    },

    async readText(relativePath) {
      const absolute = resolveSafe(root, relativePath);
      if (absolute === undefined) {
        return undefined;
      }

      try {
        const info = await stat(absolute);
        if (!info.isFile()) {
          return undefined;
        }
        return await readFile(absolute, "utf8");
      } catch {
        return undefined;
      }
    },
  };
}

export function createMemoryDetectionFs(files: Record<string, string>): DetectionFileSystem {
  const entries = new Map(
    Object.entries(files).map(([relativePath, content]) => [normalize(relativePath), content]),
  );

  return {
    async exists(relativePath) {
      if (!isSafeProjectRelativePath(relativePath)) {
        return false;
      }

      const key = normalize(relativePath);
      if (entries.has(key)) {
        return true;
      }

      const prefix = `${key}/`;
      for (const stored of entries.keys()) {
        if (stored.startsWith(prefix)) {
          return true;
        }
      }

      return false;
    },

    async readText(relativePath) {
      if (!isSafeProjectRelativePath(relativePath)) {
        return undefined;
      }

      return entries.get(normalize(relativePath));
    },
  };
}

function resolveSafe(root: string, relativePath: string): string | undefined {
  if (!isSafeProjectRelativePath(relativePath)) {
    return undefined;
  }

  const absolutePath = path.resolve(root, relativePath);
  const relative = path.relative(root, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return undefined;
  }

  return absolutePath;
}

function normalize(relativePath: string): string {
  return relativePath.replaceAll("\\", "/");
}
