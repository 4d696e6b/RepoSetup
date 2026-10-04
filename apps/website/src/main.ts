import "./style.css";
import { catalog, handoff } from "./catalog.js";
import { el, link } from "./dom.js";
import { intro, draft } from "./ui.js";
import { home, integrations, presets } from "./discovery.js";
import { detail, presetDetail } from "./details.js";
import { builder } from "./builder.js";
import { howTo } from "./how-to.js";
const app = document.querySelector<HTMLDivElement>("#app")!;
function render(focus = false) {
  const [route, query = ""] = (location.hash.slice(1) || "/").split("?");
  const segments = route!.split("/").filter(Boolean);
  const page = segments[0] ?? "home";
  const id = segments[1];
  const params = new URLSearchParams(query);
  const builderContext =
    page === "builder" && catalog.contexts.some((context) => context.id === id)
      ? id
      : draft.contextId;
  app.replaceChildren();
  const header = el("header", undefined, "site-header");
  header.append(link("RepoSetup", "#/", "brand"));
  const nav = el("nav");
  nav.setAttribute("aria-label", "Main navigation");
  for (const [text, target] of [
    ["By goal", "home"],
    ["Libraries", "integrations"],
    ["Presets", "presets"],
    ["How to use", "how-to"],
    ["Build a selection", "builder"],
  ]) {
    const a = link(
      text!,
      target === "home" ? "#/" : `#/${target}${target === "builder" ? `/${builderContext}` : ""}`,
      target === "builder" ? "nav-action" : "",
    );
    if (page === target) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  header.append(nav);
  const main = el("main");
  main.id = "main";
  main.tabIndex = -1;
  app.append(header, main);
  if (page === "home") home(main);
  else if (page === "integrations" && !id) integrations(main, params);
  else if (page === "integrations" && catalog.integrations.some((g) => g.id === id))
    detail(
      main,
      catalog.integrations.find((g) => g.id === id)!,
    );
  else if (page === "presets" && !id) presets(main);
  else if (page === "presets" && catalog.presets.some((p) => p.id === id))
    presetDetail(
      main,
      catalog.presets.find((p) => p.id === id)!,
    );
  else if (page === "builder" && catalog.contexts.some((c) => c.id === id))
    builder(main, id!, params);
  else if (page === "how-to") howTo(main);
  else
    main.append(
      intro("Page not found", "Choose a reviewed page from the navigation above.", "REPOSETUP"),
      link("Back to goals", "#/"),
    );
  document.title = `${main.querySelector("h1")?.textContent ?? "Guide"} · RepoSetup`;
  const footer = el("footer");
  footer.append(
    el("p", "Start small. Add when you need it.", "brand"),
    el(
      "p",
      `Catalog ${catalog.revision} · Recipe ${catalog.recipeRevision} · Reviewed 2026-10-03`,
      "hint",
    ),
    el("p", `${handoff.label} · Candidate paths; release qualification pending.`, "hint"),
    link("How to use this local preview", "#/how-to"),
  );
  app.append(footer);
  if (focus) {
    main.focus();
    window.scrollTo(0, 0);
  }
}
document.querySelector<HTMLAnchorElement>(".skip")!.addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector<HTMLElement>("#main")!.focus();
});
window.addEventListener("hashchange", () => render(true));
render();
