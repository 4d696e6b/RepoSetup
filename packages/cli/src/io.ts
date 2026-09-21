import { readFile } from "node:fs/promises";

import type { CliFs, CliIo } from "./types.js";

export function createDefaultIo(): CliIo {
  return {
    writeOut(text: string): void {
      process.stdout.write(text);
    },
    writeErr(text: string): void {
      process.stderr.write(text);
    },
  };
}

export function createDefaultFs(): CliFs {
  return {
    async readFile(path: string): Promise<string> {
      return readFile(path, "utf8");
    },
  };
}

export function writeLine(write: (text: string) => void, text: string): void {
  write(text.endsWith("\n") ? text : `${text}\n`);
}
