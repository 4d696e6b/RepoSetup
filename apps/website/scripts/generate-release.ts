import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  INTEGRATION_CATEGORIES,
  INTEGRATION_STATUSES,
  PACKAGE_MANAGERS,
  RUNTIME_IDS,
  SCHEMA_VERSION,
  repoSetupConfigSchema,
  type IntegrationRelationship,
} from "@reposetup/core";
import { builtInIntegrations } from "@reposetup/integrations";
import { format, resolveConfig as resolveFormatting } from "prettier";
import { EXIT_CODES } from "rsetup";
import * as z from "zod";

import { BUNDLED_PRESETS } from "../../../packages/cli/src/presets.ts";

export const RELEASE_VERSION = "0.2.3";
export const RELEASE_SOURCE = "a213a6a1edf63771aba8d5b91bfdcf44d665de22";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const cliBin = fileURLToPath(new URL("../../../packages/cli/dist/bin.js", import.meta.url));
const outputPath = new URL("../src/generated/release.json", import.meta.url);

interface HelpRow {
  syntax: string;
  description: string;
}

interface ParsedHelp {
  usage: string;
  description: string;
  arguments: HelpRow[];
  options: HelpRow[];
  commands: HelpRow[];
}

export interface ReleaseCommand {
  id: string;
  path: string[];
  usage: string;
  description: string;
  arguments: HelpRow[];
  flags: { flags: string; description: string }[];
  children: string[];
}

export function assertReleaseVersion(packageVersion: string, cliVersion: string): void {
  if (packageVersion !== RELEASE_VERSION || cliVersion.trim() !== RELEASE_VERSION) {
    throw new Error(
      `This website documents only RepoSetup ${RELEASE_VERSION}; package=${packageVersion}, CLI=${cliVersion.trim()}.`,
    );
  }
}

function cliOutput(args: string[]): string {
  return execFileSync(process.execPath, [cliBin, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1" },
  });
}

export function parseHelp(output: string): ParsedHelp {
  const lines = output.split(/\r?\n/);
  const usage = lines.find((line) => line.startsWith("Usage: "))?.slice(7);
  if (usage === undefined) throw new Error("CLI help is missing Usage metadata.");

  const parsed: ParsedHelp = { usage, description: "", arguments: [], options: [], commands: [] };
  let section: "description" | "arguments" | "options" | "commands" = "description";
  for (const line of lines.slice(lines.findIndex((item) => item.startsWith("Usage: ")) + 1)) {
    if (line.trim() === "Arguments:") {
      section = "arguments";
    } else if (line.trim() === "Options:") {
      section = "options";
    } else if (line.trim() === "Commands:") {
      section = "commands";
    } else if (line.trim() !== "") {
      if (section === "description") {
        parsed.description += `${parsed.description === "" ? "" : " "}${line.trim()}`;
      } else {
        const row = /^\s{2}(\S.*?)\s{2,}(\S.*)$/.exec(line);
        if (row?.[1] !== undefined && row[2] !== undefined) {
          parsed[section].push({ syntax: row[1], description: row[2] });
        } else if (/^\s+\S/.test(line)) {
          const previous = parsed[section].at(-1);
          if (previous === undefined) throw new Error(`Unrecognized CLI help row: ${line}`);
          previous.description += ` ${line.trim()}`;
        } else {
          throw new Error(`Unrecognized CLI help content: ${line}`);
        }
      }
    }
  }
  if (parsed.options.length === 0) throw new Error(`CLI help options missing: ${usage}`);
  return parsed;
}

function discoverCommands(help: ParsedHelp, parentPath: string[] = []): ReleaseCommand[] {
  return help.commands.flatMap((row) => {
    const name = row.syntax.split(/\s+/)[0];
    if (name === undefined || name === "help") return [];
    const path = [...parentPath, name];
    const childHelp = parseHelp(cliOutput([...path, "--help"]));
    const children = discoverCommands(childHelp, path);
    return [
      {
        id: path.join("-"),
        path,
        usage: childHelp.usage,
        description: childHelp.description,
        arguments: childHelp.arguments,
        flags: childHelp.options.map(({ syntax, description }) => ({ flags: syntax, description })),
        children: children
          .filter((child) => child.path.length === path.length + 1)
          .map((child) => child.id),
      },
      ...children,
    ];
  });
}

function relationships(items: IntegrationRelationship[] | undefined): IntegrationRelationship[] {
  return (items ?? []).map(({ kind, target, reason }) => ({ kind, target: { ...target }, reason }));
}

function assertUnchangedReleaseDefinitions(): void {
  const changed = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      RELEASE_SOURCE,
      "--",
      "packages/core/src",
      "packages/integrations/src",
      "packages/registry/src",
      "packages/cli/src",
      "packages/cli/package.json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  ).trim();
  if (changed !== "") {
    throw new Error(`Release definitions differ from published ${RELEASE_VERSION}:\n${changed}`);
  }
}

export function generateReleaseFacts() {
  assertUnchangedReleaseDefinitions();
  const packageJson = JSON.parse(
    readFileSync(new URL("../../../packages/cli/package.json", import.meta.url), "utf8"),
  ) as { name: string; version: string; engines: { node: string }; bin: Record<string, string> };
  assertReleaseVersion(packageJson.version, cliOutput(["--version"]));
  const rootHelp = parseHelp(cliOutput(["--help"]));

  return {
    schemaVersion: 1,
    source: { tag: "v0.2.3", revision: RELEASE_SOURCE },
    package: {
      name: packageJson.name,
      version: packageJson.version,
      nodeEngine: packageJson.engines.node,
      binNames: Object.keys(packageJson.bin),
    },
    cli: {
      name: "reposetup",
      usage: rootHelp.usage,
      description: rootHelp.description,
      globalFlags: rootHelp.options.map(({ syntax, description }) => ({
        flags: syntax,
        description,
      })),
      commands: discoverCommands(rootHelp),
    },
    config: {
      schemaVersion: SCHEMA_VERSION,
      packageManagers: PACKAGE_MANAGERS,
      runtimes: RUNTIME_IDS,
      jsonSchema: z.toJSONSchema(repoSetupConfigSchema),
      validationNotes: [
        "The CLI also validates safe project names and relative paths; these custom checks are not expressed by JSON Schema.",
        "Schema acceptance does not guarantee a qualified combination. The CLI resolves relationships and support before changing files.",
      ],
    },
    categories: INTEGRATION_CATEGORIES,
    statuses: INTEGRATION_STATUSES,
    integrations: builtInIntegrations.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      status: item.status,
      documentationUrl: item.documentationUrl,
      keywords: item.keywords ?? [],
      addable: item.addable === true,
      removable: item.removable === true && item.remove !== undefined,
      detectable: item.detect !== undefined,
      verifiable: item.verify !== undefined,
      verification: item.verification ?? null,
      requirements: relationships(item.requirements),
      recommendations: relationships(item.recommendations),
      conflicts: relationships(item.conflicts),
      includes: relationships(item.includes),
      alternatives: relationships(item.alternatives),
      optionsSchema: item.optionSchema === undefined ? null : z.toJSONSchema(item.optionSchema),
    })),
    presets: BUNDLED_PRESETS.map(({ id, name, description, support, config }) => ({
      id,
      name,
      description,
      support,
      config: repoSetupConfigSchema.parse(config),
    })),
    exitCodes: EXIT_CODES,
  };
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const facts = generateReleaseFacts();
  const formatting = await resolveFormatting(fileURLToPath(outputPath));
  writeFileSync(outputPath, await format(JSON.stringify(facts), { ...formatting, parser: "json" }));
  process.stdout.write(
    `Generated RepoSetup ${facts.package.version}: ${facts.cli.commands.length} commands, ${facts.integrations.length} integrations, ${facts.presets.length} presets.\n`,
  );
}
