import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseHelp } from "../scripts/generate-release.js";
import { docBySlug, searchPages } from "../src/reference/docs/model.js";
import {
  taskGuides,
  taskPreparePrompt,
  taskImplementPrompt,
} from "../src/reference/docs/task-guides.js";
import { release } from "../src/reference/release.js";

describe("unreleased task compiler guides beside the published reference", () => {
  it("makes preview workflows discoverable without promoting commands into 0.3.1", () => {
    expect(release.cli.commands.some((command) => command.path[0] === "task")).toBe(false);
    expect(taskGuides.every((page) => page.group === "Preview")).toBe(true);
    for (const page of taskGuides) expect(docBySlug.get(page.slug)).toBe(page);
    expect(searchPages("coding plan").some((page) => page.slug === "task-compiler")).toBe(true);
    expect(searchPages("model routing").some((page) => page.slug === "task-router")).toBe(true);
    expect(JSON.stringify(taskGuides)).not.toMatch(/npx rsetup(?:@\S+)? task/);
  });

  it("keeps runnable task examples consistent with the actual built preview parser", () => {
    const bin = fileURLToPath(new URL("../../../packages/cli/dist/bin.js", import.meta.url));
    let checked = 0;
    for (const page of taskGuides) {
      for (const section of page.sections) {
        for (const line of section.code?.split("\n") ?? []) {
          const match =
            /^node (?:\/absolute\/path\/to\/RepoSetup\/)?packages\/cli\/dist\/bin\.js task(?: (\S+))?(.*)$/.exec(
              line,
            );
          if (!match) continue;
          const command = match[1];
          const help = parseHelp(
            execFileSync(
              process.execPath,
              [bin, "task", ...(command && command !== "--help" ? [command] : []), "--help"],
              { encoding: "utf8" },
            ),
          );
          const allowed = new Set(
            help.options.flatMap(({ syntax }) => syntax.match(/--[a-z][\w-]*/g) ?? []),
          );
          for (const flag of line.match(/--[a-z][\w-]*/g) ?? [])
            expect(allowed.has(flag), line).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(7);
  });

  it("distinguishes local advisory handoffs, qualified routing and spending approval", () => {
    const local = JSON.stringify(taskGuides[0]);
    const managed = JSON.stringify(taskGuides[1]);
    expect(local).toContain("does not switch Codex's model");
    expect(local).toContain("nonzero exit");
    expect(local).toContain("unverified");
    expect(managed).toContain("TASK_CAPABILITY_UNAVAILABLE");
    expect(managed).toContain("--approve-run <summaryId>");
    expect(managed).toContain("--allow-provider-usage");
    expect(managed).toContain("no Azure runtime adapter");
    expect(taskPreparePrompt).toContain("Do not treat model-written review JSON as my approval");
    expect(taskImplementPrompt).toContain("do not fabricate RepoSetup acceptance receipts");
  });
});
