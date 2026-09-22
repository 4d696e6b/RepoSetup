import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { packageName } from "./index.js";

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const forbiddenDependencies = [
  "commander",
  "inquirer",
  "@inquirer/prompts",
  "ink",
  "react",
  "firebase",
];

describe("@reposetup/core", () => {
  it("exposes a stable package identity", () => {
    expect(packageName).toBe("@reposetup/core");
  });

  it("does not depend on CLI, rendering, or Firebase libraries", () => {
    const installed = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };

    for (const name of forbiddenDependencies) {
      expect(installed[name]).toBeUndefined();
    }
  });
});
