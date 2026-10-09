import { codeBlock, el, eyebrow, link, pageIntro, tag } from "./dom.js";
import { experimentalIngredients, release } from "./release.js";
import validateNpmName from "validate-npm-package-name";

const draft = { name: "my-app", preset: "next-sqlite" };
export function safeName(value: string) {
  return (
    value.length <= 64 &&
    /^[a-z0-9][a-z0-9._-]*$/.test(value) &&
    validateNpmName(value).validForNewPackages &&
    !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(value) &&
    !value.endsWith(".")
  );
}
export function presetCommands(id: string, name: string) {
  if (!release.presets.some((preset) => preset.id === id) || !safeName(name)) return null;
  const filename = `reposetup-${name}.json`;
  const command = `npx rsetup@0.2.3 create --config ${filename}`;
  return { preview: `${command} --dry-run`, create: command, filename };
}
export function builder(main: HTMLElement, id: string) {
  const preset = release.presets.find((item) => item.id === id);
  if (!preset) return false;
  draft.preset = id;
  main.append(
    link("← All presets", "#/presets", "back-link"),
    pageIntro(
      "YOUR SETUP, EXPLAINED",
      "Start with a clear plan.",
      "Choose a bundled recipe, name your project, and preview it in your terminal. Everything here uses the published 0.2.3 CLI.",
    ),
  );
  const layout = el("div", undefined, "builder-layout");
  const form = el("form", undefined, "builder-form");
  form.addEventListener("submit", (event) => event.preventDefault());
  form.append(eyebrow("01 / CHOOSE A RECIPE"));
  const label = el("label", "Starting preset");
  label.htmlFor = "preset-choice";
  const select = el("select");
  select.id = "preset-choice";
  for (const item of release.presets) {
    const option = el("option", item.name);
    option.value = item.id;
    select.append(option);
  }
  select.value = id;
  select.addEventListener("change", () => {
    location.hash = `#/builder/${select.value}`;
  });
  form.append(label, select, el("p", preset.description, "hint"));
  form.append(eyebrow("02 / NAME YOUR PROJECT"));
  const nameLabel = el("label", "Project name");
  nameLabel.htmlFor = "project-name";
  const name = el("input");
  name.id = "project-name";
  name.value = draft.name;
  name.autocomplete = "off";
  name.maxLength = 64;
  name.setAttribute("aria-describedby", "name-hint name-error");
  const help = el(
    "p",
    "Lowercase letters, numbers, hyphens, dots, and underscores. Avoid reserved package and device names. The config sets a new folder with this name under the directory where you run the command.",
    "hint",
  );
  help.id = "name-hint";
  const error = el("p", "", "field-error");
  error.id = "name-error";
  error.setAttribute("role", "status");
  form.append(nameLabel, name, help, error, eyebrow("03 / KNOW WHAT'S INCLUDED"));
  const ingredients = el("div", undefined, "ingredients");
  for (const item of preset.config.integrations)
    ingredients.append(
      link(
        release.integrations.find((integration) => integration.id === item.id)?.name ?? item.id,
        `#/integrations/${item.id}`,
        "ingredient",
      ),
    );
  form.append(
    ingredients,
    el(
      "p",
      "These ingredients match the bundled preset exactly. To make different choices, use interactive create or a reviewed configuration file.",
      "hint",
    ),
    link("How configuration works  ↗", "#/docs/configuration"),
  );
  const experimental = experimentalIngredients(preset);
  if (experimental.length > 0)
    form.append(
      el(
        "p",
        `Includes experimental integrations: ${experimental.map((item) => item.name).join(", ")}.`,
        "notice",
      ),
      link("Read this preset's support scope  ↗", `#/docs/preset-${id}`),
    );
  const review = el("section", undefined, "builder-review");
  review.setAttribute("aria-label", "Review your setup");
  const update = () => {
    draft.name = name.value;
    const commands = presetCommands(id, name.value);
    name.setAttribute("aria-invalid", String(!commands));
    error.textContent = commands
      ? ""
      : "Use a lowercase project name without spaces, paths, shell symbols, or reserved package and device names.";
    review.replaceChildren(
      eyebrow("THE LOCAL HANDOFF"),
      el("h2", preset.name),
      tag(`${preset.config.runtime.id} · ${preset.config.packageManager}`),
    );
    if (!commands) {
      review.append(el("p", "Correct the project name to generate commands and configuration."));
      return;
    }
    review.append(
      el("h3", "1. Download your recipe"),
      el(
        "p",
        `Save ${commands.filename} in the parent directory of your new project. The file contains this recipe and an explicit ${name.value}/ destination.`,
      ),
    );
    const download = el("button", `Download ${commands.filename}  ↓`, "button primary");
    download.type = "button";
    const feedback = el("p", "", "hint");
    feedback.setAttribute("role", "status");
    download.addEventListener("click", () => {
      const config = { ...preset.config, project: { name: name.value, path: name.value } };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(config, null, 2) + "\n"], { type: "application/json" }),
      );
      const a = el("a");
      a.href = url;
      a.download = commands.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      feedback.textContent =
        "Config downloaded. Put it in the directory where you run the config command.";
    });
    review.append(download, feedback);
    review.append(
      el("h3", "2. Preview the plan"),
      el(
        "p",
        "After downloading, run this in the same directory as the config. It prints the plan without writing project files or installing packages.",
      ),
      codeBlock(commands.preview, "Copy preview command"),
    );
    review.append(
      el("h3", "3. Create after reviewing"),
      el(
        "p",
        "Run this when the plan fits. The CLI shows the plan and asks for confirmation before execution.",
      ),
      codeBlock(commands.create, "Copy create command"),
    );
    if (preset.config.integrations.some((item) => item.id === "postgresql"))
      review.append(
        el(
          "p",
          "Database services are yours to configure and run. This recipe does not provision a server or apply migrations.",
          "notice",
        ),
      );
    review.append(link("Prerequisites and recovery  ↗", "#/docs/getting-started"));
  };
  name.addEventListener("input", update);
  update();
  layout.append(form, review);
  main.append(layout);
  return true;
}
