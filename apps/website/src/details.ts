import { catalog } from "./catalog.js";
import { el, link, section, list } from "./dom.js";
import { intro, contextLabel, contextOf, nameOf, integrationCard } from "./ui.js";
import type { WebsiteGuidance, WebsitePreset } from "@reposetup/registry";
export function detail(main: HTMLElement, item: WebsiteGuidance) {
  main.append(
    link("← All libraries", "#/integrations", "back"),
    intro(
      item.name,
      item.purpose,
      `${item.category.toUpperCase()} / ${item.status.toUpperCase()} SETUP`,
    ),
  );
  const layout = el("div", undefined, "detail-layout");
  const body = el("div");
  for (const [title, text] of [
    ["When to add it", item.when],
    ["When to skip it", item.unnecessary],
    ["A small example", item.example],
    ["What setup changes", item.impact],
    [
      "What you still do",
      "Write your application logic and review the generated files. The website cannot see your current files; the local CLI determines the actual plan.",
    ],
    ["Alternatives", item.alternatives],
  ])
    body.append(section(title!, text));
  if (item.requirements.length)
    body.append(section("Why requirements matter"), list(item.requirements.map((r) => r.reason)));
  if (item.includes.length)
    body.append(section("Included capabilities"), list(item.includes.map((r) => r.reason)));
  if (item.conflicts.length)
    body.append(section("Conflicts to resolve"), list(item.conflicts.map((r) => r.reason)));
  const side = el("aside", undefined, "panel");
  side.append(
    el("h2", "Before you choose"),
    el("p", item.prerequisites),
    el("h3", "Supported in this builder"),
  );
  const contexts = catalog.contexts.filter(
    (c) => c.context.frameworkId === item.id || c.optionalIds.includes(item.id),
  );
  for (const context of contexts) {
    side.append(
      link(contextLabel(context.id), `#/builder/${context.id}`, "context-link"),
      el("p", context.limitations, "hint"),
    );
  }
  side.append(
    el("h3", "Local operations"),
    el(
      "p",
      `Create${item.addable ? ", add to a detected project" : " (framework starter only)"}${item.removable ? ", remove dependency" : ""}. Diagnosis is read-only; no repair flow is offered here.`,
    ),
    el("h3", "Recipe version evidence"),
    list(catalog.directVersions[item.id] ?? ["See the framework recipe"]),
    el("p", `Recipe revision: ${catalog.recipeRevision}`, "hint"),
    el(
      "p",
      `Guidance reviewed ${item.reviewedAt}; setup checked ${item.verification?.verifiedAt ?? "see recipe evidence"}.`,
      "hint",
    ),
    link("Read the official documentation ↗", item.documentationUrl, "text-link"),
  );
  layout.append(body, side);
  main.append(layout);
}
export function presetDetail(main: HTMLElement, preset: WebsitePreset) {
  const context = contextOf(preset.contextId);
  main.append(
    link("← Compare presets", "#/presets", "back"),
    intro(preset.name, preset.outcome, "MINIMAL STARTER / CANDIDATE"),
  );
  main.append(section("Who this is for", preset.audience), section("The essentials"));
  for (const [id, reason] of Object.entries(preset.reasons))
    main.append(
      el("h3", nameOf(id)),
      el("p", reason),
      link("Learn about the framework →", `#/integrations/${id}`, "text-link"),
    );
  main.append(
    el(
      "p",
      `${contextLabel(context.id)}. ${catalog.integrations.find((g) => g.id === context.context.frameworkId)!.prerequisites}`,
      "notice",
    ),
  );
  const optional = section(
    "Optional means optional",
    "No optional library is selected by default. Add a capability only when its purpose matches your next step.",
  );
  const grid = el("div", undefined, "grid");
  context.optionalIds.forEach((id) =>
    grid.append(integrationCard(catalog.integrations.find((g) => g.id === id)!)),
  );
  optional.append(grid);
  main.append(
    optional,
    section("Evidence and limitations", context.limitations),
    el("p", `Parent recipe evidence: ${context.evidence}`, "hint"),
    link("Customize this starting point →", `#/builder/${context.id}?mode=create`, "button"),
  );
}
