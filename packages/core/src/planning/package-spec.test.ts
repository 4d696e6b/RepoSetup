import { describe, expect, it } from "vitest";

import {
  isPackageAddCommand,
  packageNameFromSpec,
  packageSpecsFromAddArgs,
} from "./package-spec.js";

describe("packageNameFromSpec", () => {
  it("strips versions from npm package specs", () => {
    expect(packageNameFromSpec("zod")).toBe("zod");
    expect(packageNameFromSpec("prisma@prev")).toBe("prisma");
    expect(packageNameFromSpec("@prisma/client@7")).toBe("@prisma/client");
    expect(packageNameFromSpec("@types/better-sqlite3")).toBe("@types/better-sqlite3");
  });
});

describe("packageSpecsFromAddArgs", () => {
  it("keeps package specs and drops flags", () => {
    expect(
      packageSpecsFromAddArgs([
        "add",
        "--save-dev",
        "--allow-build=prisma",
        "prisma@prev",
        "@types/better-sqlite3",
      ]),
    ).toEqual(["prisma@prev", "@types/better-sqlite3"]);
  });
});

describe("isPackageAddCommand", () => {
  it("recognizes pnpm add and npm install of packages", () => {
    expect(isPackageAddCommand("pnpm", ["add", "zod"])).toBe(true);
    expect(isPackageAddCommand("npm", ["install", "--save-dev", "prettier"])).toBe(true);
    expect(isPackageAddCommand("npm", ["install"])).toBe(false);
    expect(isPackageAddCommand("pnpm", ["exec", "prisma", "init"])).toBe(false);
  });
});
