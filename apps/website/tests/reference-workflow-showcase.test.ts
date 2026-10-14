import { expect, it } from "vitest";
import { workflowSteps } from "../src/reference/workflow-showcase.js";
import { release } from "../src/reference/release.js";
import { docBySlug } from "../src/reference/docs/model.js";

it("keeps the walkthrough examples on published commands and preserves preview and confirmation", () => {
  for (const step of workflowSteps) {
    for (const line of step.command.split("\n")) {
      const [runner, pkg, command, ...args] = line.split(" ");
      expect(runner).toBe("npx");
      expect(pkg).toBe(`rsetup`);
      const definition = release.cli.commands.find((item) => item.id === command);
      expect(definition, line).toBeDefined();
      for (const flag of args.filter((item) => item.startsWith("--")))
        expect(
          definition!.flags.some((item) => item.flags.includes(flag)),
          line,
        ).toBe(true);
    }
    const [slug, anchor] = step.href.replace("#/docs/", "").split("#");
    const page = docBySlug.get(slug!);
    expect(page).toBeDefined();
    if (anchor) expect(page!.sections.some((item) => item.id === anchor)).toBe(true);
  }
  expect(workflowSteps[0].command).toContain("--config reposetup-my-app.json --dry-run");
  expect(workflowSteps[1].command).toBe(workflowSteps[0].command.replace(" --dry-run", ""));
  expect(workflowSteps.every((step) => !step.command.includes("--yes"))).toBe(true);
});
