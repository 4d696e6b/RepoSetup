import { artwork, el, link } from "./reference/dom.js";
import { REPOSITORY } from "./reference/release.js";

export function navigation(
  page: string,
  builderContext: string,
  showSearch: (event: Event) => void,
) {
  const header = el("header", undefined, "site-header compact-header");
  const brand = link("", "#/", "brand");
  brand.setAttribute("aria-label", "RepoSetup home");
  brand.append(artwork("reposetup-wordmark.svg", "RepoSetup"));

  const nav = el("nav", undefined, "main-nav");
  nav.id = "primary-navigation";
  nav.setAttribute("aria-label", "Main navigation");
  const docs = link("Docs", "#/docs", "nav-direct");
  if (page === "docs") docs.setAttribute("aria-current", "page");
  const explore = el("div", undefined, "nav-explore");
  const trigger = el("button", "Explore", "explore-trigger");
  trigger.type = "button";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "explore-links");
  if (["goals", "learn", "integrations", "presets", "release", "how-to"].includes(page))
    trigger.classList.add("is-current");
  const chevron = el("span", "⌄", "nav-chevron");
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(chevron);
  const panel = el("div", undefined, "explore-panel");
  panel.id = "explore-links";
  panel.hidden = true;
  for (const [title, items] of [
    [
      "Find your starting point",
      [
        ["By goal", "goals", "#/goals", "Find tools for what you want to make"],
        ["Minimal starters", "learn", "#/learn/starters", "Start small, add only what you need"],
        ["How it works", "how-to", "#/how-to", "Choose here, review in your terminal"],
      ],
    ],
    [
      "Browse RepoSetup",
      [
        ["Integrations", "integrations", "#/integrations", "Explore the full supported catalog"],
        ["Presets", "presets", "#/presets", "Ready-made combinations"],
        ["What's new", "release", "#/release", "Published changes and release history"],
      ],
    ],
  ] as const) {
    const group = el("div", undefined, "explore-group");
    group.append(el("p", title, "nav-group-title"));
    for (const [label, target, href, description] of items) {
      const item = link("", href, "explore-link");
      item.setAttribute("aria-label", label);
      item.append(
        el("span", label, "nav-link-title"),
        el("span", description, "nav-link-description"),
      );
      if (page === target) item.setAttribute("aria-current", "page");
      group.append(item);
    }
    panel.append(group);
  }
  const extra = el("div", undefined, "explore-footer");
  extra.append(link("GitHub ↗", REPOSITORY));
  panel.append(extra);
  explore.append(trigger, panel);
  const search = el("button", undefined, "search-trigger");
  search.type = "button";
  search.setAttribute("aria-label", "Open documentation search");
  search.title = "Search documentation (⌘/Ctrl K)";
  const icon = el("span", undefined, "search-icon");
  icon.setAttribute("aria-hidden", "true");
  search.append(icon, el("span", "Search", "search-label"));
  search.addEventListener("click", (event) => {
    closeExplore();
    showSearch(event);
  });
  nav.append(docs, explore, search);

  const actions = el("div", undefined, "header-actions");
  const build = link("Build", `#/builder/${builderContext}`, "button primary header-cta");
  build.setAttribute("aria-label", "Build a selection");
  if (page === "builder") build.setAttribute("aria-current", "page");
  const toggle = el("button", "Menu", "menu-toggle");
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Open navigation");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", nav.id);
  const menuIcon = el("span", undefined, "menu-icon");
  menuIcon.setAttribute("aria-hidden", "true");
  toggle.append(menuIcon);
  actions.append(build, toggle);
  header.append(brand, nav, actions);

  function closeExplore() {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }
  function closeNavigation() {
    closeExplore();
    header.classList.remove("navigation-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  }
  trigger.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    trigger.setAttribute("aria-expanded", String(!panel.hidden));
  });
  toggle.addEventListener("click", () => {
    if (header.classList.contains("navigation-open")) closeNavigation();
    else {
      header.classList.add("navigation-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close navigation");
    }
  });
  const escape = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest("dialog")) return;
    if (event.key !== "Escape" || (panel.hidden && !header.classList.contains("navigation-open")))
      return;
    const wasMobileOpen = header.classList.contains("navigation-open");
    closeNavigation();
    (wasMobileOpen ? toggle : trigger).focus();
    event.preventDefault();
  };
  document.addEventListener("keydown", escape);
  header.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("a")) closeNavigation();
  });
  const outside = (event: PointerEvent) => {
    if (event.target instanceof Element && event.target.closest("dialog")) return;
    if (event.target instanceof Node && !header.contains(event.target)) closeNavigation();
  };
  document.addEventListener("pointerdown", outside);
  let mobile = window.innerWidth <= 760;
  const resize = () => {
    const nextMobile = window.innerWidth <= 760;
    if (nextMobile !== mobile) closeNavigation();
    mobile = nextMobile;
  };
  window.addEventListener("resize", resize);
  return {
    element: header,
    dispose() {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
    },
  };
}
