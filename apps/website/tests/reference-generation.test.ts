import {
  PACKAGE_MANAGERS,
  RUNTIME_IDS,
  parseRepoSetupConfig,
  resolveConfig,
} from "@reposetup/core";
import { builtInIntegrations, createBuiltInRegistry } from "@reposetup/integrations";
import { describe, expect, it } from "vitest";

import {
  RELEASE_SOURCE,
  RELEASE_VERSION,
  assertReleaseDefinitionsMatch,
  assertReleaseVersion,
  generateReleaseFacts,
  parseHelp,
  verifyReleaseSnapshot,
} from "../scripts/generate-release";
import release from "../src/reference/generated/release.json";

describe("reviewed 0.4.0 candidate release catalog", () => {
  it("matches the built CLI, checked-in registry, presets, and config schema", () => {
    expect(release).toEqual(verifyReleaseSnapshot());
    expect(release.package.version).toBe(RELEASE_VERSION);
    expect(release.source.revision).toBe(RELEASE_SOURCE);
    expect(release.integrations).toHaveLength(37);
    expect(release.presets).toHaveLength(5);
    expect(release.cli.commands).toHaveLength(16);
  });

  it("rejects changed definitions and tampered pinned facts", () => {
    expect(generateReleaseFacts()).toEqual(release);
    expect(() => assertReleaseDefinitionsMatch("packages/cli/src/run-cli.ts")).toThrow(
      "Release definitions differ",
    );
    expect(() =>
      verifyReleaseSnapshot(Buffer.from(JSON.stringify({ ...release, cli: {} }))),
    ).toThrow("Pinned reference bytes differ");
  });

  it("rejects other package versions and mismatched built CLI versions", () => {
    expect(() => assertReleaseVersion(RELEASE_VERSION, `${RELEASE_VERSION}\n`)).not.toThrow();
    expect(() => assertReleaseVersion("0.2.3", "0.2.3")).toThrow("documents only");
    expect(() => assertReleaseVersion("0.3.0", "0.2.3")).toThrow("documents only");
    expect(() => assertReleaseVersion("0.4.0", "0.3.0")).toThrow("documents only");
  });

  it("retains factual relationships and capability labels without executable definitions", () => {
    expect(new Set(release.integrations.map((item) => item.id)).size).toBe(37);
    for (const fact of release.integrations) {
      const definition = builtInIntegrations.find((item) => item.id === fact.id);
      expect(definition).toBeDefined();
      expect(fact.status).toBe(definition?.status);
      expect(fact.addable).toBe(definition?.addable === true);
      expect(fact.removable).toBe(
        definition?.removable === true && definition.remove !== undefined,
      );
      expect(fact.requirements).toEqual(definition?.requirements ?? []);
      expect(fact.recommendations).toEqual(definition?.recommendations ?? []);
      expect(fact.conflicts).toEqual(definition?.conflicts ?? []);
      expect(fact.includes).toEqual(definition?.includes ?? []);
      expect(fact.alternatives).toEqual(definition?.alternatives ?? []);
      expect(fact).not.toHaveProperty("plan");
      expect(fact).not.toHaveProperty("supports");
      expect(fact).not.toHaveProperty("remove");
      expect(fact).not.toHaveProperty("optionSchema");
      expect(new URL(fact.documentationUrl).protocol).toBe("https:");
    }
  });

  it("keeps every bundled recipe valid without broadening its support guarantee", () => {
    expect(release.config.packageManagers).toEqual(PACKAGE_MANAGERS);
    expect(release.config.runtimes).toEqual(RUNTIME_IDS);
    const registry = createBuiltInRegistry();
    for (const preset of release.presets) {
      const parsed = parseRepoSetupConfig(preset.config);
      expect(parsed.success).toBe(true);
      if (!parsed.success) throw new Error(parsed.error.message);
      expect(preset.support).toBe("guaranteed");
      const result = resolveConfig(parsed.config, registry);
      expect(result.errors).toEqual([]);
    }
  });

  it("documents the actual new and retained parser flags", () => {
    expect(release.cli.commands.map((command) => command.id)).toEqual([
      "create",
      "add",
      "remove",
      "presets",
      "search",
      "info",
      "stack",
      "doctor",
      "export",
      "task",
      "task-compile",
      "task-next",
      "task-status",
      "task-run",
      "registry",
      "registry-validate",
    ]);
    const flags = [
      ...release.cli.globalFlags,
      ...release.cli.commands.flatMap((command) => command.flags),
    ].map((flag) => flag.flags);
    expect(flags).toContain("-c, --config <path>");
    expect(flags).toContain("--preset <id>");
    for (const flag of ["--selection <token>", "--selection-file <path>", "--diff", "--fix"])
      expect(flags).toContain(flag);
    expect(flags.some((flag) => /--recipe/.test(flag))).toBe(false);
    expect(release.cli.commands.find((command) => command.id === "registry")?.children).toEqual([
      "registry-validate",
    ]);
    expect(release.cli.commands.find((command) => command.id === "task")?.children).toEqual([
      "task-compile",
      "task-next",
      "task-status",
      "task-run",
    ]);
  });
});

describe("CLI help metadata parsing", () => {
  it("preserves wrapped descriptions and fails on missing usage/options metadata", () => {
    expect(
      parseHelp(
        "Usage: reposetup example [options]\n\nA useful command.\n\nOptions:\n  --config <path>  Read configuration\n                   from this path.\n  -h, --help       display help for command\n",
      ).options[0],
    ).toEqual({ syntax: "--config <path>", description: "Read configuration from this path." });
    expect(() => parseHelp("Options:\n  -h, --help  Help")).toThrow("missing Usage");
    expect(() => parseHelp("Usage: reposetup\nA description")).toThrow("options missing");
  });
});
