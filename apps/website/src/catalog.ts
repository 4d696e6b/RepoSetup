import { categoryName, experimentalIngredients, release, type Integration } from "./release.js";
import { artwork, codeBlock, el, eyebrow, link, pageIntro, tag } from "./dom.js";
import { relationshipTarget } from "./relationships.js";

export const discoveryGoals = [
  { id: "", name: "All tools", categories: [] },
  { id: "app", name: "Build an app", categories: ["framework", "backend-framework"] },
  { id: "data", name: "Work with data", categories: ["database", "orm", "migration"] },
  { id: "test", name: "Test your work", categories: ["testing"] },
  {
    id: "workflow",
    name: "Improve your workflow",
    categories: ["linting", "formatting", "ci", "infrastructure"],
  },
] as const;

export function filterIntegrations(query = "", category = "", goal = "") {
  const goalCategories: readonly string[] =
    discoveryGoals.find((item) => item.id === goal)?.categories ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  return release.integrations.filter(
    (item) =>
      (!category || item.category === category) &&
      (!goalCategories.length || goalCategories.includes(item.category)) &&
      [item.name, item.id, item.description, item.category, ...item.keywords]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
  );
}
const contextNotes: Record<string, string> = {
  nextjs:
    "A React framework for full web applications. Choose it when you need routing and server-rendered pages together.",
  "react-vite":
    "A React frontend built with Vite. Useful for browser interfaces; add a separate backend when your app needs one.",
  express:
    "A small Node.js HTTP framework. Use it when you want explicit control over API routes and middleware.",
  fastapi:
    "A Python API framework built around types and validation. A good starting point for a typed web API.",
  flask:
    "A lightweight Python web framework. Use it for a smaller server application with explicit choices.",
  zod: "Checks untrusted values against a TypeScript-friendly schema. Useful at API, form, and configuration boundaries.",
  prisma:
    "A database toolkit with generated client code. Its schema and migrations need your own review and a reachable database.",
  postgresql:
    "A relational database for structured data. RepoSetup writes configuration; you provide and run the database service.",
  mongodb:
    "A document database. Add it when your data model needs it, and configure a reachable server yourself.",
  docker:
    "A container runtime prerequisite and setup guide. RepoSetup does not install Docker or start containers.",
  "docker-compose":
    "Describes a local PostgreSQL service. You review and run it manually after setting local credentials.",
};

export function integrationCard(item: Integration) {
  const card = el("article", undefined, "integration-card");
  const top = el("div", undefined, "card-top");
  top.append(
    el("span", categoryName(item.category), "eyebrow"),
    tag(item.status, item.status === "experimental" ? "experimental" : ""),
  );
  card.append(
    top,
    el("h2", item.name),
    el("p", contextNotes[item.id] ?? item.description),
    link("Explore integration  ↗", `#/integrations/${item.id}`),
  );
  return card;
}

export function integrations(main: HTMLElement, params: URLSearchParams) {
  main.append(
    pageIntro(
      "THE INTEGRATION LIBRARY",
      "Find the right tool.",
      "Understand what each integration does, where it fits, and what RepoSetup 0.2.3 supports.",
    ),
  );
  const controls = el("div", undefined, "catalog-controls");
  const label = el("label", "Search integrations", "sr-only");
  label.htmlFor = "library-search";
  const search = el("input");
  search.id = "library-search";
  search.type = "search";
  search.placeholder = "Search a tool, category, or idea…";
  search.value = params.get("q") ?? "";
  const categoryLabel = el("label", "Category", "sr-only");
  categoryLabel.htmlFor = "category";
  const select = el("select");
  select.id = "category";
  const all = el("option", "All categories");
  all.value = "";
  select.append(all);
  for (const category of [...new Set(release.integrations.map((item) => item.category))]) {
    const option = el("option", categoryName(category));
    option.value = category;
    select.append(option);
  }
  select.value = params.get("category") ?? "";
  let selectedGoal = "";
  controls.append(label, search, categoryLabel, select);
  const chips = el("div", undefined, "filter-chips");
  for (const { id, name } of discoveryGoals) {
    const button = el("button", name, "chip");
    button.type = "button";
    button.addEventListener("click", () => {
      selectedGoal = id;
      select.value = "";
      update();
    });
    button.dataset.goal = id;
    chips.append(button);
  }
  const count = el("p", "", "result-count");
  count.setAttribute("role", "status");
  const grid = el("div", undefined, "integration-grid");
  const update = () => {
    const filtered = filterIntegrations(search.value, select.value, selectedGoal);
    count.textContent = `${filtered.length} integrations in release 0.2.3`;
    grid.replaceChildren(...filtered.map(integrationCard));
    if (!filtered.length)
      grid.append(el("p", "No matches. Try another term or category.", "empty-state"));
    for (const chip of chips.querySelectorAll("button"))
      chip.setAttribute(
        "aria-pressed",
        String(!select.value && chip.dataset.goal === selectedGoal),
      );
  };
  search.addEventListener("input", update);
  select.addEventListener("change", () => {
    selectedGoal = "";
    update();
  });
  main.append(
    controls,
    chips,
    count,
    grid,
    el(
      "p",
      "Integration maturity varies. Registry presence does not qualify every combination; the local CLI checks the actual project context.",
      "catalog-note",
    ),
  );
  update();
}

export function integrationDetail(main: HTMLElement, id: string) {
  const item = release.integrations.find((entry) => entry.id === id);
  if (!item) return false;
  main.append(
    link("← Integration library", "#/integrations", "back-link"),
    pageIntro(categoryName(item.category), item.name, contextNotes[item.id] ?? item.description),
  );
  const layout = el("div", undefined, "detail-layout");
  const article = el("article", undefined, "reading-content");
  article.append(
    eyebrow("WHAT REPOSETUP ADDS"),
    el("h2", "Its role in your stack"),
    el("p", item.description),
    el(
      "p",
      "Add a tool because your project needs its role. Keep your starting stack small, and inspect the local plan before changing an existing project.",
    ),
  );
  const status = el("div", undefined, "notice");
  status.append(
    tag(item.status),
    el(
      "p",
      item.status === "experimental"
        ? "This recipe is experimental. It is documented here because it exists in 0.2.3; it is not a promise of a fully qualified application path."
        : "This definition retains its candidate maturity in the published CLI. Qualification applies to the recorded recipes, not every possible combination.",
    ),
  );
  article.append(status, el("h2", "Requirements & relationships"));
  const ul = el("ul");
  for (const [kind, relationships] of [
    ["Requires", item.requirements],
    ["Recommends", item.recommendations],
    ["Conflicts", item.conflicts],
    ["Includes", item.includes],
    ["Alternative", item.alternatives],
  ] as const) {
    for (const relation of relationships) {
      const target = relationshipTarget(relation.target);
      const row = el("li", `${kind}: `);
      row.append(link(target.label, target.href), ` — ${relation.reason}`);
      ul.append(row);
    }
  }
  if (!ul.children.length)
    ul.append(
      el("li", "No relationship notes are declared. Context checks still apply in the CLI."),
    );
  article.append(
    ul,
    el("h2", "Explore it locally"),
    codeBlock(`npx rsetup@0.2.3 info ${item.id}`),
    link("Full integration reference  ↗", `#/docs/integration-${item.id}`),
  );
  const aside = el("aside", undefined, "detail-aside");
  aside.append(
    eyebrow("IN THIS RELEASE"),
    el("h2", "At a glance"),
    tag(item.id),
    el("p", `Add recipe: ${item.addable ? "available" : "not declared"}`),
    el("p", `Safe remove recipe: ${item.removable ? "available" : "not declared"}`),
    link("Official documentation  ↗", item.documentationUrl, "button primary"),
    link("Read the add/remove guide", "#/docs/add-remove"),
  );
  layout.append(article, aside);
  main.append(layout);
  return true;
}

export function presets(main: HTMLElement) {
  main.append(
    pageIntro(
      "CURATED STARTING POINTS",
      "A head start.\nYour next big thing.",
      "Five bundled recipes in RepoSetup 0.2.3. Compare their ingredients, understand the prerequisites, and preview the one that fits.",
    ),
  );
  const grid = el("div", undefined, "preset-grid");
  for (const [index, item] of release.presets.entries()) {
    const card = el("article", undefined, "preset-card");
    const top = el("div", undefined, "card-top");
    top.append(
      el("span", `0${index + 1}`, "index-label"),
      tag(item.config.runtime.id === "node" ? "JavaScript / TypeScript" : "Python"),
    );
    const list = el("div", undefined, "ingredients");
    for (const selected of item.config.integrations) {
      const integration = release.integrations.find((entry) => entry.id === selected.id);
      list.append(
        link(integration?.name ?? selected.id, `#/integrations/${selected.id}`, "ingredient"),
      );
    }
    card.append(
      top,
      el("h2", item.name),
      el("p", item.description),
      list,
      el(
        "p",
        `${item.config.packageManager} · ${item.config.integrations.length} included integrations`,
        "hint",
      ),
      link("Explore this recipe  ↗", `#/builder/${item.id}`, "button primary"),
      link("Read its reference", `#/docs/preset-${item.id}`),
    );
    const experimental = experimentalIngredients(item);
    if (experimental.length > 0)
      card.append(
        el(
          "p",
          `Experimental ingredients: ${experimental.map((entry) => entry.name).join(", ")}.`,
          "hint",
        ),
      );
    grid.append(card);
  }
  main.append(
    grid,
    el(
      "div",
      "The CLI calls these bundled presets guaranteed recipes. That label does not promote every included integration to stable or provision a database service. Read the individual support labels and preview the actual plan.",
      "notice",
    ),
  );
  const banner = el("section", undefined, "compact-banner");
  banner.append(
    artwork("feature-compose.png"),
    el(
      "div",
      "Prefer to start small? Interactive create asks for your framework and tools. You can add supported integrations later.",
    ),
    link("Read the create guide  ↗", "#/docs/create", "button secondary"),
  );
  main.append(banner);
}
