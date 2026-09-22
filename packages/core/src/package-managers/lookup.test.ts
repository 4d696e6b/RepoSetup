import { describe, expect, it } from "vitest";

import { getPackageManagerAdapter, toPackageManagerCommand } from "./lookup.js";

describe("getPackageManagerAdapter", () => {
  it("returns adapters for npm, pnpm, uv, and pip", () => {
    expect(getPackageManagerAdapter("npm")?.id).toBe("npm");
    expect(getPackageManagerAdapter("pnpm")?.id).toBe("pnpm");
    expect(getPackageManagerAdapter("uv")?.id).toBe("uv");
    expect(getPackageManagerAdapter("pip")?.id).toBe("pip");
  });

  it("does not invent a Bun adapter", () => {
    expect(getPackageManagerAdapter("bun")).toBeUndefined();
  });
});

describe("toPackageManagerCommand", () => {
  it("expands an install_package operation through the matching adapter", () => {
    const result = toPackageManagerCommand({
      type: "install_package",
      packageManager: "pnpm",
      packages: ["zod"],
      cwd: ".",
      description: "Install Zod",
      dev: true,
    });

    expect(result).toEqual({
      ok: true,
      operation: {
        type: "run_command",
        command: "pnpm",
        args: ["add", "--save-dev", "zod"],
        cwd: ".",
        description: "Install Zod",
        requiresNetwork: true,
      },
    });
  });

  it("rejects Bun until that adapter exists", () => {
    const result = toPackageManagerCommand({
      type: "install_package",
      packageManager: "bun",
      packages: ["zod"],
      cwd: ".",
      description: "Install Zod",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("UNSUPPORTED_CONTEXT");
  });
});
