import { parseRepoSetupConfig, resolveConfig } from "@reposetup/core";
import { createBuiltInRegistry } from "@reposetup/integrations";
import { describe, expect, it } from "vitest";

import { authoredPages } from "../src/docs/content";
import { docBySlug, docPages, searchPages } from "../src/docs/model";
import { release } from "../src/release";
import { relationshipTarget } from "../src/relationships";

const requiredGuides = [
  "getting-started",
  "create",
  "add-remove",
  "presets",
  "configuration",
  "inspect",
  "preview",
  "safety",
  "recovery",
  "databases",
  "troubleshooting",
  "command-basics",
  "glossary",
  "contribute",
];
const flagNames = (syntax: string) => syntax.match(/--?[A-Za-z][\w-]*/g) ?? [];
const textOf = (page: (typeof docPages)[number]) =>
  [
    page.slug,
    page.title,
    page.description,
    ...page.sections.flatMap((section) => [
      section.id,
      section.title,
      ...section.paragraphs,
      ...(section.bullets ?? []),
      section.code ?? "",
      ...(section.links ?? []).flatMap(({ label, href }) => [label, href]),
    ]),
  ].join("\n");

describe("published 0.2.3 documentation integrity", () => {
  it("has every required guide with unique routes and accessible heading metadata", () => {
    expect(docBySlug.size).toBe(docPages.length);
    expect(new Set(docPages.map(({ slug }) => slug)).size).toBe(docPages.length);
    for (const slug of requiredGuides) expect(docBySlug.has(slug), slug).toBe(true);
    for (const page of docPages) {
      expect(page.slug, page.title).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(page.title.trim().length).toBeGreaterThan(0);
      expect(page.description.trim().length).toBeGreaterThan(0);
      expect(["Start", "Guides", "Reference", "Help"]).toContain(page.group);
      expect(page.sections.length, page.slug).toBeGreaterThan(0);
      expect(new Set(page.sections.map(({ id }) => id)).size, page.slug).toBe(page.sections.length);
      for (const section of page.sections) {
        expect(section.id, page.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(section.title.trim().length, `${page.slug}/${section.id}`).toBeGreaterThan(0);
        expect(section.paragraphs.length, `${page.slug}/${section.id}`).toBeGreaterThan(0);
        expect(section.paragraphs.every((paragraph) => paragraph.trim().length > 0)).toBe(true);
      }
    }
  });

  it("resolves every authored and generated internal link against existing routes", () => {
    for (const page of docPages) {
      for (const section of page.sections) {
        for (const link of section.links ?? []) {
          const label = `${page.slug}/${section.id}: ${link.href}`;
          expect(link.label.trim().length, label).toBeGreaterThan(0);
          if (link.href.startsWith("https://")) {
            expect(new URL(link.href).protocol, label).toBe("https:");
            continue;
          }
          expect(link.href, label).toMatch(/^#\//);
          const [path, query] = link.href.slice(2).split("?");
          const [route, id, extra] = path!.split("/");
          expect(extra, label).toBeUndefined();
          expect(["", "docs", "integrations", "presets", "builder", "release"], label).toContain(
            route,
          );
          if (route === "" || route === "release") expect(id, label).toBeUndefined();
          if (route === "docs" && id !== undefined) expect(docBySlug.has(id), label).toBe(true);
          if (route === "integrations" && id !== undefined)
            expect(
              release.integrations.some((item) => item.id === id),
              label,
            ).toBe(true);
          if (query !== undefined) {
            expect(route, label).toBe("integrations");
            expect(id, label).toBeUndefined();
            const params = new URLSearchParams(query);
            expect([...params.keys()], label).toEqual(["category"]);
            expect(release.categories, label).toContain(params.get("category"));
          }
          if ((route === "presets" || route === "builder") && id !== undefined)
            expect(
              release.presets.some((item) => item.id === id),
              label,
            ).toBe(true);
        }
      }
    }
  });

  it("makes every released command, integration, and preset discoverable with factual labels", () => {
    for (const command of release.cli.commands) {
      const reference = docBySlug.get(`cli-${command.id}`);
      expect(reference, command.id).toBeDefined();
      expect(textOf(reference!), command.id).toContain(command.usage);
      for (const flag of command.flags)
        expect(textOf(reference!), command.id).toContain(flag.flags);
    }
    const globals = textOf(docBySlug.get("cli-global")!);
    for (const flag of release.cli.globalFlags) expect(globals).toContain(flag.flags);
    const exits = textOf(docBySlug.get("cli-exit-codes")!);
    for (const [name, value] of Object.entries(release.exitCodes)) {
      expect(exits).toContain(`${value} — ${name.replaceAll("_", " ").toLowerCase()}`);
    }
    for (const integration of release.integrations) {
      const reference = docBySlug.get(`integration-${integration.id}`);
      expect(reference, integration.id).toBeDefined();
      const text = textOf(reference!);
      expect(text).toContain(integration.id);
      expect(text).toContain(`Registry maturity: ${integration.status}`);
      expect(text).toContain(integration.documentationUrl);
      for (const relation of [
        ...integration.requirements,
        ...integration.recommendations,
        ...integration.conflicts,
        ...integration.includes,
        ...integration.alternatives,
      ]) {
        expect(text, integration.id).toContain(relation.reason);
        const target = relationshipTarget(relation.target);
        const relationships = reference!.sections.find((section) => section.id === "relationships");
        expect(relationships?.bullets, integration.id).toContain(
          `${relation.kind}: ${target.label} — ${relation.reason}`,
        );
        expect(relationships?.links, integration.id).toContainEqual(target);
      }
    }
    for (const preset of release.presets) {
      const reference = docBySlug.get(`preset-${preset.id}`);
      expect(reference, preset.id).toBeDefined();
      const text = textOf(reference!);
      expect(text).toContain(preset.config.framework.id);
      expect(text).toContain(preset.config.runtime.id);
      expect(text).toContain(preset.config.packageManager);
      for (const integration of preset.config.integrations)
        expect(text).toContain(`#/docs/integration-${integration.id}`);
    }
  });

  it("keeps command examples pinned to the shipped package and its actual parser flags", () => {
    let examples = 0;
    for (const page of docPages) {
      for (const section of page.sections) {
        for (const line of section.code?.split("\n") ?? []) {
          if (!line.startsWith("npx ")) continue;
          examples += 1;
          const tokens = line.trim().split(/\s+/);
          expect(tokens[1], `${page.slug}: ${line}`).toBe("rsetup@0.2.3");
          const args = tokens.slice(2);
          const command =
            release.cli.commands
              .filter((item) => item.path.every((part, index) => args[index] === part))
              .sort((a, b) => b.path.length - a.path.length)[0] ??
            release.cli.commands.find((item) => args.includes(item.path[0]!));
          if (args.some((arg) => !arg.startsWith("-"))) {
            expect(command, `${page.slug}: missing public command in ${line}`).toBeDefined();
          }
          const allowedFlags = new Set([
            ...release.cli.globalFlags.flatMap(({ flags }) => flagNames(flags)),
            ...(command?.flags ?? []).flatMap(({ flags }) => flagNames(flags)),
          ]);
          for (const flag of args.filter((token) => token.startsWith("-"))) {
            expect(allowedFlags.has(flag), `${page.slug}: unknown public flag in ${line}`).toBe(
              true,
            );
          }
          expect(args, `${page.slug}: ${line}`).not.toContain("--yes");
          const presetIndex = args.indexOf("--preset");
          if (presetIndex !== -1)
            expect(release.presets.some(({ id }) => id === args[presetIndex + 1])).toBe(true);
          const frameworkIndex = args.indexOf("--framework");
          if (frameworkIndex !== -1)
            expect(
              release.integrations.some(
                ({ id, category }) => id === args[frameworkIndex + 1] && category === "framework",
              ),
            ).toBe(true);
          if (command?.id === "info" || command?.id === "add" || command?.id === "remove") {
            const firstId = args.indexOf(command.id) + 1;
            const commandArgs = args.slice(firstId);
            const optionIndex = commandArgs.findIndex((value) => value.startsWith("-"));
            for (const id of commandArgs.slice(0, optionIndex === -1 ? undefined : optionIndex)) {
              expect(
                release.integrations.some((item) => item.id === id),
                `${page.slug}: ${id}`,
              ).toBe(true);
            }
          }
        }
      }
    }
    expect(examples).toBeGreaterThan(50);
    expect(JSON.stringify(docPages)).not.toMatch(
      /0\.3\.\d|0\.4\.\d|--selection(?:-file)?|--recipe\b/,
    );
  });

  it("keeps authored JSON examples valid against the released schema and registry", () => {
    const registry = createBuiltInRegistry();
    let examples = 0;
    for (const page of authoredPages) {
      for (const section of page.sections) {
        if (!section.code?.trim().startsWith("{")) continue;
        const parsed = parseRepoSetupConfig(JSON.parse(section.code));
        expect(parsed.success, `${page.slug}/${section.id}`).toBe(true);
        if (parsed.success)
          expect(
            resolveConfig(parsed.config, registry).errors,
            `${page.slug}/${section.id}`,
          ).toEqual([]);
        examples += 1;
      }
    }
    expect(examples).toBeGreaterThan(0);
  });

  it("finds authored guidance and generated references through local multi-word search", () => {
    expect(searchPages("")).toEqual([]);
    expect(searchPages("   ")).toEqual([]);
    expect(searchPages("absent-term-that-no-page-contains")).toEqual([]);
    expect(searchPages("PROJECT RECOVERY").some(({ slug }) => slug === "recovery")).toBe(true);
    expect(searchPages("vitest").some(({ slug }) => slug === "integration-vitest")).toBe(true);
    expect(searchPages("config confirmation").some(({ slug }) => slug === "create")).toBe(true);
    expect(authoredPages.length).toBeGreaterThanOrEqual(14);
  });
});
