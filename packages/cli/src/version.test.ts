import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cliVersion } from "./version.js";

const packageJson = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"),
) as { version: string };

describe("cliVersion", () => {
  it("matches packages/cli/package.json", () => {
    expect(cliVersion()).toBe(packageJson.version);
    expect(cliVersion()).toBe("0.1.0-alpha.1");
  });
});
