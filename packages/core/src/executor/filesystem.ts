import { access, appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";

import type { ExecutorFileSystem } from "./types.js";

export function createDefaultExecutorFileSystem(): ExecutorFileSystem {
  return {
    async exists(filePath) {
      try {
        await access(filePath);
        return true;
      } catch {
        return false;
      }
    },

    async isDirectory(filePath) {
      try {
        const info = await stat(filePath);
        return info.isDirectory();
      } catch {
        return false;
      }
    },

    async mkdir(filePath) {
      await mkdir(filePath, { recursive: true });
    },

    async readFile(filePath) {
      return readFile(filePath, "utf8");
    },

    async writeFile(filePath, content) {
      await writeFile(filePath, content, "utf8");
    },

    async appendFile(filePath, content) {
      await appendFile(filePath, content, "utf8");
    },
  };
}
