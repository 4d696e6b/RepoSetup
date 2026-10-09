import "./style.css";
import "./motion.css";
import { createMotionControl, mountMotion } from "./motion.js";
import { artwork, codeBlock, el, eyebrow, link, pageIntro } from "./dom.js";
import { home } from "./home.js";
import { integrations, integrationDetail, presets } from "./catalog.js";
import { builder } from "./builder.js";
import { docs, searchResults } from "./docs/render.js";
import { INSTALL, REPOSITORY, RELEASE_URL } from "./release.js";

const app = document.querySelector<HTMLDivElement>("#app")!;
let searchDialog: HTMLDialogElement;
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
function header(page: string) {
  const header = el("header", undefined, "site-header");
  const brand = link("", "#/", "brand");
  brand.setAttribute("aria-label", "RepoSetup home");
  brand.append(artwork("reposetup-logo.png", "RepoSetup"));
  const nav = el("nav", undefined, "main-nav");
  nav.setAttribute("aria-label", "Main navigation");
  for (const [label, target, href] of [
    ["Docs", "docs", "#/docs"],
    ["Integrations", "integrations", "#/integrations"],
    ["Presets", "presets", "#/presets"],
    ["What's new", "release", "#/release"],
  ]) {
    const a = link(label!, href!);
    if (page === target) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  const actions = el("div", undefined, "header-actions");
  const search = el("button", "Search", "search-trigger");
  search.type = "button";
  search.setAttribute("aria-label", "Open documentation search");
  search.append(el("kbd", "⌘ K"));
  search.addEventListener("click", showSearch);
  actions.append(
    search,
    createMotionControl(),
    link("GitHub  ↗", REPOSITORY, "github-link"),
    link("Get started  ↗", "#/docs/getting-started", "button primary header-cta"),
  );
  header.append(brand, nav, actions);
  return header;
}
function releasePage(main: HTMLElement) {
  main.append(
    pageIntro(
      "PUBLISHED OCTOBER 9, 2026",
      "0.2.3.\nA stronger foundation.",
      "A release focused on installed-stack reliability, clearer setup guidance, and practical recovery.",
    ),
  );
  const content = el("article", undefined, "reading-content release-content");
  content.append(eyebrow("WHAT CHANGED"));
  for (const [title, description] of [
    [
      "Your build tools stay included",
      "Node creation includes development dependencies even under parent production or omit settings, so Express types, Node types, and build tools are installed.",
    ],
    [
      "More reliable database setup",
      "PostgreSQL SQLAlchemy recipes include the Psycopg binary driver and a driver-specific URL. Generated JavaScript Prisma imports work with Node 24.",
    ],
    [
      "Clearer container prerequisites",
      "Generated Compose guidance explains Docker and database setup, loopback ports, local passwords, and persistent storage. You start services yourself.",
    ],
    [
      "Actionable recovery",
      "Cache permission errors and redacted timeout diagnostics explain the failed operation. Incomplete creation reports its destination. Doctor stays read-only.",
    ],
  ])
    content.append(el("h2", title), el("p", description));
  content.append(
    el("h2", "Get the published version"),
    codeBlock(INSTALL),
    codeBlock("npx rsetup@0.2.3 --version"),
    el(
      "p",
      "Requires Node 24+. Updating the CLI does not silently update an existing generated project.",
    ),
    link("Read full release notes  ↗", RELEASE_URL),
    el("h2", "Qualification has a scope"),
    el(
      "p",
      "Recorded CI recipes cover Linux, macOS, and Windows, with representative real database cases. That evidence does not qualify every combination, native Windows 11, Linux arm64, general migration workflows, or Playwright browser journeys. Integration maturity is unchanged.",
    ),
    link("Read the support and safety guide  ↗", "#/docs/safety"),
  );
  main.append(content);
}
function footer() {
  const footer = el("footer", undefined, "site-footer");
  const top = el("div", undefined, "footer-top");
  const brand = el("div");
  brand.append(
    artwork("reposetup-logo.png", "RepoSetup", "footer-logo"),
    el("p", "Less setup. More making."),
  );
  const links = el("nav");
  links.setAttribute("aria-label", "Footer navigation");
  links.append(
    link("Documentation", "#/docs"),
    link("Integrations", "#/integrations"),
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
function render(focus = false) {
  const [pathQuery, anchor] = (location.hash.slice(1) || "/").split("#");
  const [path, query = ""] = pathQuery!.split("?");
  const [page = "home", id] = path!.split("/").filter(Boolean);
  app.replaceChildren(header(page));
  const main = el("main", undefined, "main-content");
  main.id = "main";
  main.tabIndex = -1;
  app.append(main);
  let found = true;
  if (page === "home") home(main);
  else if (page === "docs") docs(main, id, anchor);
  else if (page === "integrations" && !id) integrations(main, new URLSearchParams(query));
  else if (page === "integrations") found = integrationDetail(main, id!);
  else if (page === "presets") presets(main);
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
  document.title = `${main.querySelector("h1")?.textContent ?? "Guide"} · RepoSetup 0.2.3`;
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
