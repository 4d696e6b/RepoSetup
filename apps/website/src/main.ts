import "./reference/style.css";
import "./reference/motion.css";
import "./reference/stack-scene.css";
import "./reference/experience.css";
import "./reference/release-history.css";
import { mountMotion } from "./reference/motion.js";
import { mountStackScene } from "./reference/stack-scene.js";
import { artwork, codeBlock, el, link, pageIntro } from "./reference/dom.js";
import { home } from "./reference/home.js";
import { integrations, integrationDetail, presets } from "./reference/catalog.js";
import { builder } from "./reference/builder.js";
import { docs, searchResults } from "./reference/docs/render.js";
import { INSTALL, REPOSITORY } from "./reference/release.js";
import { renderReleaseHistory } from "./reference/release-history.js";
import { initializeObservability } from "./reference/observability.js";

import "./beginner.css";
import beginnerRoutes from "./generated/routes.json";
let lastBuilderContext = beginnerRoutes.contexts[0]!;
let renderSequence = 0;
const app = document.querySelector<HTMLDivElement>("#app")!;
const recordPublicPage = initializeObservability();
let searchDialog: HTMLDialogElement;
let disposeScene = () => {};
function showSearch() {
  searchDialog.showModal();
  searchDialog.querySelector("input")?.focus();
}
function createSearch() {
  const dialog = el("dialog", undefined, "search-dialog");
  dialog.setAttribute("aria-labelledby", "search-title");
  const top = el("div", undefined, "search-heading");
  const title = el("h2", "Search RepoSetup");
  title.id = "search-title";
  const close = el("button", "Close", "chip");
  close.type = "button";
  close.addEventListener("click", () => dialog.close());
  top.append(title, close);
  const label = el("label", "Search documentation and integrations");
  label.htmlFor = "global-search";
  const input = el("input");
  input.type = "search";
  input.id = "global-search";
  input.placeholder = "Try create, PostgreSQL, or recovery…";
  const status = el("p", "Search is local to this browser.", "hint");
  status.setAttribute("role", "status");
  const results = el("div");
  input.addEventListener("input", () => {
    status.textContent = `${searchResults(results, input.value)} results`;
  });
  dialog.append(top, label, input, status, results);
  dialog.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("a")) dialog.close();
  });
  return dialog;
}
function header(page: string, builderContext = lastBuilderContext) {
  const header = el("header", undefined, "site-header");
  const brand = link("", "#/", "brand");
  brand.setAttribute("aria-label", "RepoSetup home");
  brand.append(artwork("reposetup-wordmark.svg", "RepoSetup"));
  const nav = el("nav", undefined, "main-nav");
  nav.setAttribute("aria-label", "Main navigation");
  for (const [label, target, href] of [
    ["Docs", "docs", "#/docs"],
    ["By goal", "goals", "#/goals"],
    ["Minimal starters", "learn", "#/learn/starters"],
    ["Integrations", "integrations", "#/integrations"],
    ["Presets", "presets", "#/presets"],
    ["What's new", "release", "#/release"],
  ]) {
    const a = link(label!, href!);
    if (page === target) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  const selectionLink = link("Build a selection", `#/builder/${builderContext}`, "nav-action");
  nav.append(selectionLink);
  const actions = el("div", undefined, "header-actions");
  const search = el("button", "Search", "search-trigger");
  search.type = "button";
  search.setAttribute("aria-label", "Open documentation search");
  search.append(el("kbd", "⌘ K"));
  search.addEventListener("click", showSearch);
  actions.append(
    search,
    link("GitHub  ↗", REPOSITORY, "github-link"),
    link("Get started  ↗", "#/docs/getting-started", "button primary header-cta"),
  );
  header.append(brand, nav, actions);
  return header;
}
function releasePage(main: HTMLElement) {
  main.append(
    pageIntro(
      "PUBLISHED RELEASE HISTORY",
      "What's new.",
      "Every published release, newest first. Explore the changes and qualification behind each version. Dates follow npm publication in UTC.",
    ),
  );
  main.append(renderReleaseHistory());
  const content = el("section", undefined, "reading-content release-content");
  content.setAttribute("aria-label", "Use the current release");
  content.append(
    el("h2", "Get the published version"),
    codeBlock(INSTALL),
    codeBlock("npx rsetup --version"),
    el(
      "p",
      "Requires Node 24+. Updating the CLI does not silently update an existing generated project.",
    ),
    el("h2", "Qualification has a scope"),
    el(
      "p",
      "Recorded CI recipes cover Linux, macOS, and Windows, with representative real database cases. That evidence does not qualify every combination, native Windows 11, Linux arm64, general migration workflows, or Playwright browser journeys. Integration maturity is unchanged.",
    ),
    link("Read the support and safety guide  ↗", "#/docs/safety"),
  );
  const nextSteps = el("nav", undefined, "release-next-steps");
  nextSteps.setAttribute("aria-label", "Continue with RepoSetup");
  nextSteps.append(
    link("Read the getting started guide →", "#/docs/getting-started"),
    link("Explore the presets →", "#/presets"),
  );
  content.append(nextSteps);
  main.append(content);
}
function footer() {
  const footer = el("footer", undefined, "site-footer");
  const top = el("div", undefined, "footer-top");
  const brand = el("div");
  brand.append(
    artwork("reposetup-wordmark.svg", "RepoSetup", "footer-logo"),
    el("p", "Less setup. More making."),
  );
  const links = el("nav");
  links.setAttribute("aria-label", "Footer navigation");
  links.append(
    link("Documentation", "#/docs"),
    link("Integrations", "#/integrations"),
    link("Website privacy", "#/docs/safety#website-privacy"),
    link("npm package ↗", "https://www.npmjs.com/package/rsetup/v/0.2.3"),
    link("Report an issue ↗", `${REPOSITORY}/issues`),
  );
  top.append(brand, links);
  footer.append(top);
  const bottom = el("div", undefined, "footer-bottom");
  bottom.append(
    el("span", "Open source under MIT. Built for clarity."),
    el("span", "Documentation & tools for CLI 0.2.3"),
  );
  footer.append(bottom);
  return footer;
}
async function render(focus = false) {
  const sequence = ++renderSequence;
  disposeScene();
  const [pathQuery, anchor] = (location.hash.slice(1) || "/").split("#");
  const [path, query = ""] = pathQuery!.split("?");
  const [page = "home", id, learningId] = path!.split("/").filter(Boolean);
  const contextRoute = page === "builder" && beginnerRoutes.contexts.includes(id!);
  const minimalPreset = page === "presets" && beginnerRoutes.presets.includes(id!);
  const learningRoute =
    page === "goals" || page === "learn" || page === "how-to" || contextRoute || minimalPreset;
  let learning: typeof import("./beginner/entry.js") | undefined;
  try {
    if (learningRoute) learning = await import("./beginner/entry.js");
  } catch {
    if (sequence !== renderSequence) return;
    app.replaceChildren(header(page));
    const failed = el("main");
    failed.id = "main";
    failed.append(
      pageIntro(
        "RETRY THIS PAGE",
        "This section could not load.",
        "Reload the page to retry the development preview.",
      ),
    );
    app.append(failed, footer());
    return;
  }
  if (sequence !== renderSequence) return;
  if (contextRoute) lastBuilderContext = id!;
  app.replaceChildren(header(page));
  const notice = el(
    "aside",
    "0.3.0 development preview. Full reference pages describe published 0.2.3; new selections require the reviewed local CLI.",
    "development-notice",
  );
  notice.setAttribute("aria-label", "Development preview");
  notice.append(" ", link("Set up the matching CLI", "#/how-to"));
  app.append(notice);
  const main = el("main", undefined, "main-content");
  main.id = "main";
  main.tabIndex = -1;
  app.append(main);
  let found = true;
  const beginner = (renderPage: (surface: HTMLElement) => void) => {
    const surface = el("div", undefined, "beginner-surface");
    main.append(surface);
    renderPage(surface);
  };
  if (page === "home") home(main);
  else if (page === "goals") beginner(learning!.goals);
  else if (page === "learn" && id === "starters") beginner(learning!.starters);
  else if (page === "learn" && id === "libraries" && !learningId)
    beginner((surface) => learning!.libraries(surface, new URLSearchParams(query)));
  else if (page === "learn" && id === "libraries") {
    const item = learning!.catalog.integrations.find((item) => item.id === learningId);
    if (item) beginner((surface) => learning!.detail(surface, item));
    else found = false;
  } else if (page === "how-to") beginner(learning!.howTo);
  else if (page === "docs") docs(main, id, anchor);
  else if (page === "integrations" && !id) integrations(main, new URLSearchParams(query));
  else if (page === "integrations") found = integrationDetail(main, id!);
  else if (page === "presets" && id) {
    const preset = learning?.catalog.presets.find((item) => item.id === id);
    if (preset) beginner((surface) => learning!.presetDetail(surface, preset));
    else found = false;
  } else if (page === "presets") {
    presets(main);
    main.append(link("Explore minimal starters →", "#/learn/starters", "button secondary"));
  } else if (contextRoute)
    beginner((surface) => learning!.builder(surface, id!, new URLSearchParams(query)));
  else if (page === "builder") found = builder(main, id!);
  else if (page === "release") releasePage(main);
  else found = false;
  if (!found)
    main.append(
      pageIntro(
        "LET'S FIND YOUR WAY",
        "Page not found.",
        "Try a guide, integration, or preset from the navigation.",
      ),
      link("Back to home  ↗", "#/", "button primary"),
    );
  app.append(footer());
  searchDialog = createSearch();
  app.append(searchDialog);
  document.title = `${main.querySelector("h1")?.textContent ?? "Guide"} · RepoSetup development`;
  if (focus && !anchor) {
    main.focus();
    window.scrollTo(0, 0);
  }
  if (page === "home" && anchor === "workflow") {
    // Set focus after native fragment navigation has finished, as docs anchors do.
    requestAnimationFrame(() => {
      if (!main.isConnected) return;
      const target = main.querySelector<HTMLElement>("#workflow");
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    });
  }
  mountMotion(main, page, Boolean(anchor));
  disposeScene = mountStackScene(main);
  recordPublicPage();
}
document.querySelector<HTMLAnchorElement>(".skip-link")!.addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("main")?.focus();
});
window.addEventListener("hashchange", () => render(true));
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    showSearch();
  }
});
render();
