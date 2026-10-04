import { catalog } from "./catalog.js";
import { el, link, section, field, select } from "./dom.js";
import { intro, badge, contextLabel, presetCard, integrationCard, draft } from "./ui.js";
export function home(main: HTMLElement) {
  const hero = intro(
    "Build with intention.",
    "Understand your tools before you install them. Start with a small working project, then add a library when you know why you need it.",
    "THE REPOSETUP FIELD GUIDE",
  );
  const actions = el("div", undefined, "actions");
  actions.append(
    link("Find your starting point →", "#/presets", "button"),
    link("Browse the libraries", "#/integrations", "button secondary"),
  );
  hero.append(actions);
  const note = el("aside", undefined, "hero-note");
  note.append(
    el("span", "01 — LEARN", "eyebrow"),
    el("h2", "A smaller stack. A clearer next step."),
    el(
      "p",
      "This guide covers nine curated RepoSetup integrations. You choose public library options here; the CLI reviews the real plan on your computer.",
    ),
    badge("0.3.0 local preview"),
  );
  const layout = el("div", undefined, "hero");
  layout.append(hero, note);
  main.append(layout);
  const goals = section(
    "What do you want to build?",
    "Choose the outcome first. Frameworks and optional tools come next.",
  );
  const grid = el("div", undefined, "grid");
  catalog.presets.forEach((item, i) => grid.append(presetCard(item, i)));
  goals.append(grid);
  main.append(goals);
  const capabilities = section(
    "Already have a project?",
    "Learn about a capability, then choose an additive selection for a supported project context.",
  );
  const row = el("div", undefined, "goal-links");
  for (const goal of ["test an app", "validate input", "format code"])
    row.append(
      link(`${goal} →`, `#/integrations?goal=${encodeURIComponent(goal)}`, "button secondary"),
    );
  capabilities.append(row);
  main.append(capabilities);
  const process = section("From an idea to a reviewed local plan");
  const steps = el("div", undefined, "grid steps");
  for (const [title, text] of [
    ["01 / Learn", "Read when a library helps and when you can skip it."],
    ["02 / Choose", "Keep the essentials. Deliberately add optional capabilities."],
    [
      "03 / Review locally",
      "Copy one command. The local CLI checks, shows the plan and asks you to confirm.",
    ],
  ]) {
    const card = el("div");
    card.append(el("h3", title), el("p", text));
    steps.append(card);
  }
  process.append(steps);
  main.append(process);
}
export function integrations(main: HTMLElement, params: URLSearchParams) {
  main.append(
    intro(
      "Tools, explained.",
      "Browse the first reviewed beginner catalog. Candidate labels describe RepoSetup’s setup evidence, not the quality of an upstream library.",
      "INTEGRATIONS / 09",
    ),
  );
  const filters = el("div", undefined, "filters");
  const search = el("input");
  search.type = "search";
  search.id = "library-search";
  search.value = params.get("goal") ?? "";
  const ecosystem = select("ecosystem", [
    { value: "all", label: "All ecosystems" },
    { value: "node", label: "JavaScript / TypeScript" },
    { value: "python", label: "Python" },
  ]);
  const category = select("category", [
    { value: "all", label: "All categories" },
    ...[...new Set(catalog.integrations.map((item) => item.category))].map((value) => ({
      value,
      label: value,
    })),
  ]);
  const context = select("context-filter", [
    { value: "all", label: "All reviewed contexts" },
    ...catalog.contexts.map((item) => ({ value: item.id, label: contextLabel(item.id) })),
  ]);
  filters.append(
    field("Search by library or goal", search),
    field("Ecosystem", ecosystem),
    field("Category", category),
    field("Setup context", context),
  );
  main.append(filters);
  const count = el("p", "", "hint");
  count.setAttribute("role", "status");
  const grid = el("div", undefined, "grid");
  main.append(count, grid);
  const update = () => {
    const matches = catalog.integrations.filter((item) => {
      const contexts = catalog.contexts.filter(
        (c) => c.context.frameworkId === item.id || c.optionalIds.includes(item.id),
      );
      return (
        `${item.name} ${item.purpose} ${item.goals.join(" ")}`
          .toLowerCase()
          .includes(search.value.toLowerCase().trim()) &&
        (category.value === "all" || category.value === item.category) &&
        (ecosystem.value === "all" ||
          contexts.some((c) => c.context.runtimeId === ecosystem.value)) &&
        (context.value === "all" || contexts.some((c) => c.id === context.value))
      );
    });
    count.textContent = `${matches.length} ${matches.length === 1 ? "library" : "libraries"} found`;
    grid.replaceChildren(...matches.map(integrationCard));
    if (!matches.length)
      grid.append(
        el("p", "No reviewed libraries match. Try a different goal or clear the filters."),
      );
  };
  for (const input of [search, ecosystem, category, context])
    input.addEventListener("input", update);
  update();
  main.append(
    el(
      "p",
      "This slice includes only entries with reviewed beginner guidance. Other integrations in the CLI registry are outside this builder’s scope.",
      "notice",
    ),
  );
}
export function presets(main: HTMLElement) {
  main.append(
    intro(
      "Start small. Grow deliberately.",
      "Compare three minimal project starters. A preset is a reviewed set of choices, not a promise that every possible library combination works.",
      "STARTING POINTS",
    ),
  );
  const grid = el("div", undefined, "grid");
  catalog.presets.forEach((p, i) => grid.append(presetCard(p, i)));
  main.append(grid);
  main.append(
    section(
      "Starter or capability pack?",
      "A starter creates a new project directory and sets up its framework. An existing-project capability pack only adds selected tools after the CLI detects and checks the project. It cannot replace the framework.",
    ),
    link(
      "Choose for an existing project →",
      `#/builder/${draft.contextId}?mode=add`,
      "button secondary",
    ),
  );
}
