import { codeBlock, el, eyebrow, link } from "../dom.js";
import { docBySlug, docPages, primaryPages, searchPages } from "./model.js";
import type { DocPage } from "./content.js";

export function resultKind(page: DocPage) {
  if (page.slug.startsWith("integration-")) return "Integration";
  if (page.slug.startsWith("preset-")) return "Preset";
  if (page.slug.startsWith("cli")) return "CLI reference";
  return page.group === "Help" ? "Help" : "Guide";
}
export function searchResults(container: HTMLElement, query: string) {
  const matches = searchPages(query);
  const list = el("ul", undefined, "search-results");
  for (const item of matches) {
    const li = el("li");
    const a = link("", `#/docs/${item.slug}`);
    a.append(
      el("span", resultKind(item), "eyebrow"),
      el("strong", item.title),
      el("p", item.description),
    );
    li.append(a);
    list.append(li);
  }
  container.replaceChildren(list);
  return matches.length;
}
function sidebar(slug?: string) {
  const nav = el("nav", undefined, "docs-sidebar");
  nav.setAttribute("aria-label", "Documentation sections");
  nav.append(eyebrow("DOCS / 0.2.3"));
  for (const group of ["Start", "Guides", "Reference", "Help"]) {
    nav.append(el("h2", group));
    for (const page of primaryPages.filter((item) => item.group === group)) {
      const a = link(page.title, `#/docs/${page.slug}`);
      if (page.slug === slug) a.setAttribute("aria-current", "page");
      nav.append(a);
    }
  }
  return nav;
}
export function docs(main: HTMLElement, slug?: string, anchor?: string) {
  main.classList.add("docs-main");
  const mobile = el("details", undefined, "docs-mobile-nav");
  mobile.append(el("summary", "Browse documentation"), sidebar(slug));
  main.append(mobile);
  const layout = el("div", undefined, "docs-layout");
  layout.append(sidebar(slug));
  const article = el("article", undefined, "docs-article");
  layout.append(article);
  main.append(layout);
  const crumbs = el("nav", undefined, "breadcrumbs");
  crumbs.setAttribute("aria-label", "Breadcrumbs");
  crumbs.append(link("Home", "#/"), el("span", "/"), link("Docs", "#/docs"));
  article.append(crumbs);
  if (!slug) {
    article.append(
      eyebrow("A LITTLE CLARITY GOES A LONG WAY"),
      el("h1", "Find your next step."),
      el(
        "p",
        "Everything you need to get started with RepoSetup 0.2.3. Pick a guide, look up a command, or explore the tools in your stack.",
        "lede",
      ),
    );
    const label = el("label", "Search the documentation", "sr-only");
    label.htmlFor = "docs-search";
    const search = el("input");
    search.id = "docs-search";
    search.type = "search";
    search.placeholder = "What would you like to build?";
    const count = el("p", "", "hint");
    count.setAttribute("role", "status");
    const results = el("div");
    search.addEventListener("input", () => {
      if (!search.value.trim()) {
        results.replaceChildren();
        count.textContent = "";
        return;
      }
      count.textContent = `${searchResults(results, search.value)} results`;
    });
    article.append(label, search, count, results);
    const cards = el("div", undefined, "docs-start-grid");
    for (const page of primaryPages.filter((item) =>
      ["getting-started", "presets", "inspect", "recovery", "cli", "configuration"].includes(
        item.slug,
      ),
    )) {
      const a = link("", `#/docs/${page.slug}`, "docs-start-card");
      a.append(eyebrow(page.group), el("h2", `${page.title}  ↗`), el("p", page.description));
      cards.append(a);
    }
    article.append(cards);
    return;
  }
  const entry = docBySlug.get(slug);
  if (!entry) {
    article.append(
      el("h1", "Documentation page not found"),
      el("p", "Choose a guide from the sidebar or return to search."),
      link("Find a guide", "#/docs", "button primary"),
    );
    return;
  }
  crumbs.append(el("span", "/"), el("span", entry.title));
  article.append(
    eyebrow(`${entry.group} / VERSION 0.2.3`),
    el("h1", entry.title),
    el("p", entry.description, "lede"),
  );
  const toc = el("nav", undefined, "docs-toc");
  toc.setAttribute("aria-label", "On this page");
  toc.append(eyebrow("ON THIS PAGE"));
  for (const section of entry.sections)
    toc.append(link(section.title, `#/docs/${slug}#${section.id}`));
  layout.append(toc);
  const inlineToc = el("details", undefined, "docs-inline-toc");
  inlineToc.append(el("summary", "On this page"));
  const inlineNav = el("nav");
  inlineNav.setAttribute("aria-label", "On this page");
  for (const section of entry.sections)
    inlineNav.append(link(section.title, `#/docs/${slug}#${section.id}`));
  inlineToc.append(inlineNav);
  article.append(inlineToc);
  for (const section of entry.sections) {
    const block = el("section", undefined, "docs-section");
    const heading = el("h2", section.title);
    heading.id = section.id;
    heading.tabIndex = -1;
    const permalink = link("#", `#/docs/${slug}#${section.id}`, "heading-anchor");
    permalink.setAttribute("aria-label", `Link to ${section.title}`);
    heading.append(" ", permalink);
    block.append(heading);
    for (const paragraph of section.paragraphs) block.append(el("p", paragraph));
    if (section.bullets?.length) {
      const list = el("ul");
      for (const bullet of section.bullets) list.append(el("li", bullet));
      block.append(list);
    }
    if (section.code) block.append(codeBlock(section.code, `Copy example for ${section.title}`));
    if (section.links?.length) {
      const links = el("ul", undefined, "doc-links");
      for (const item of section.links) {
        const li = el("li");
        li.append(link(`${item.label}  ↗`, item.href));
        links.append(li);
      }
      block.append(links);
    }
    article.append(block);
  }
  const index = docPages.indexOf(entry);
  const pager = el("nav", undefined, "docs-pager");
  pager.setAttribute("aria-label", "Previous and next pages");
  if (index > 0)
    pager.append(link(`← ${docPages[index - 1]!.title}`, `#/docs/${docPages[index - 1]!.slug}`));
  if (index < docPages.length - 1)
    pager.append(link(`${docPages[index + 1]!.title} →`, `#/docs/${docPages[index + 1]!.slug}`));
  article.append(
    pager,
    el("p", "Reviewed for the published 0.2.3 release · October 9, 2026", "hint"),
    link("View release source  ↗", "https://github.com/4d696e6b/RepoSetup/tree/v0.2.3"),
  );
  if (anchor)
    requestAnimationFrame(() => {
      const target = document.getElementById(anchor);
      target?.scrollIntoView();
      target?.focus({ preventScroll: true });
    });
}
