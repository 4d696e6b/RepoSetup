import { TextDecoder } from "node:util";
import { open, readFile } from "node:fs/promises";

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
    async readBoundedFile(path: string, maxBytes: number): Promise<string> {
      const file = await open(path, "r");
      try {
        if (!(await file.stat()).isFile())
          throw new Error("Selection input must be a regular file.");
        const buffer = Buffer.alloc(maxBytes + 1);
        let offset = 0;
        while (offset < buffer.length) {
          const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, null);
          if (bytesRead === 0) break;
          offset += bytesRead;
        }
        if (offset > maxBytes) throw new Error("Selection file too large.");
        return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, offset));
      } finally {
        await file.close();
      }
    },
    async readFile(path: string): Promise<string> {
      return readFile(path, "utf8");
    },
  };
}

export function writeLine(write: (text: string) => void, text: string): void {
  write(text.endsWith("\n") ? text : `${text}\n`);
}
