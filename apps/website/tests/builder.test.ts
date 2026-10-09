import { repoSetupConfigSchema } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { presetCommands, safeName } from "../src/builder";
import { release } from "../src/release";
import validateNpmName from "validate-npm-package-name";

describe("bounded 0.2.3 recipe handoff", () => {
  it("generates preview and confirmed create commands for exactly the five shipped presets", () => {
    expect(release.presets).toHaveLength(5);
    for (const preset of release.presets) {
      const result = presetCommands(preset.id, "docs-demo");
      expect(result).toEqual({
        preview: "npx rsetup@0.2.3 create --config reposetup-docs-demo.json --dry-run",
        create: "npx rsetup@0.2.3 create --config reposetup-docs-demo.json",
        filename: "reposetup-docs-demo.json",
      });
      expect(result?.create).not.toContain("--yes");
      expect(JSON.stringify(result)).not.toMatch(
        /--selection|--selection-file|--recipe|0\.3\.|0\.4\./,
      );
      const config = { ...preset.config, project: { name: "docs-demo", path: "docs-demo" } };
      expect(repoSetupConfigSchema.safeParse(config).success).toBe(true);
      expect(config.integrations).toEqual(preset.config.integrations);
      expect(config.framework).toEqual(preset.config.framework);
      expect(config.packageManager).toBe(preset.config.packageManager);
    }
    expect(presetCommands("next-minimal", "docs-demo")).toBeNull();
    expect(presetCommands("unknown", "docs-demo")).toBeNull();
    expect(presetCommands("react-vite;echo unsafe", "docs-demo")).toBeNull();
  });

  it("accepts only bounded names that remain a single CLI argument and valid config name", () => {
    for (const name of ["my-app", "project_123", "app.example", "a1", "a".repeat(64)]) {
      expect(safeName(name), name).toBe(true);
      expect(validateNpmName(name).validForNewPackages, name).toBe(true);
      const result = presetCommands("react-vite", name);
      expect(result?.filename).toBe(`reposetup-${name}.json`);
      expect(result?.create.split(" ")).toEqual([
        "npx",
        "rsetup@0.2.3",
        "create",
        "--config",
        `reposetup-${name}.json`,
      ]);
      expect(
        repoSetupConfigSchema.safeParse({
          ...release.presets[0]!.config,
          project: { name, path: name },
        }).success,
      ).toBe(true);
    }
  });

  it("suppresses both handoffs for paths, injection, whitespace, and reserved device names", () => {
    const unsafeNames = [
      "",
      ".",
      "..",
      "../app",
      "app/child",
      "app\\child",
      "/app",
      "C:\\app",
      " app",
      "app ",
      "two words",
      "app\nnext",
      "app\0",
      "app;echo",
      "app&&echo",
      "app|echo",
      "$(echo)",
      "`echo`",
      "'app'",
      '"app"',
      "--help",
      "app.",
      "con",
      "CON.txt",
      "prn",
      "aux",
      "nul",
      "com1",
      "COM9.txt",
      "lpt1",
      "LPT9.txt",
      "A1",
      "node_modules",
      "favicon.ico",
      "http",
      "fs",
      "events",
      "a".repeat(65),
    ];
    for (const name of unsafeNames) {
      expect(safeName(name), name).toBe(false);
      expect(presetCommands("react-vite", name), name).toBeNull();
    }
  });
});
