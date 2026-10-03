import { catalog } from "./catalog.js";
import { el, link } from "./dom.js";
import type { Choice } from "./selection.js";
import type { WebsiteGuidance, WebsitePreset } from "@reposetup/registry";
export const draft: Choice = {
  contextId: catalog.contexts[0]!.id,
  mode: "create",
  ids: [],
  name: "my-app",
  path: "my-app",
};
export const nameOf = (id: string) =>
  catalog.integrations.find((item) => item.id === id)?.name ?? id;
export const contextOf = (id: string) => catalog.contexts.find((item) => item.id === id)!;
export const presetOf = (id: string) => catalog.presets.find((item) => item.contextId === id)!;
export const contextLabel = (id: string) => {
  const context = contextOf(id).context;
  return `${nameOf(context.frameworkId)} · ${context.typescript ? "TypeScript · " : "Python · "}${context.packageManager}`;
};
export function intro(title: string, description: string, eyebrow: string) {
  const node = el("div", undefined, "intro");
  node.append(el("p", eyebrow, "eyebrow"), el("h1", title), el("p", description, "lede"));
  return node;
}
export function badge(text: string) {
  return el("span", text, "badge");
}
export function integrationCard(item: WebsiteGuidance) {
  const card = el("article", undefined, "card");
  card.append(badge(item.category), el("h3"));
  card.querySelector("h3")!.append(link(item.name, `#/integrations/${item.id}`));
  card.append(
    el("p", item.purpose),
    el("p", `Setup maturity: ${item.status}`, "hint"),
    link("Understand this library →", `#/integrations/${item.id}`, "text-link"),
  );
  return card;
}
export function presetCard(item: WebsitePreset, index: number) {
  const card = el("article", undefined, "card preset");
  card.append(
    el(
      "p",
      `0${index + 1} / ${contextOf(item.contextId).context.runtimeId === "node" ? "JS / TS" : "PYTHON"}`,
      "eyebrow",
    ),
    el("h3", item.name),
    el("p", item.outcome),
    el("p", contextLabel(item.contextId), "hint"),
    link("Explore the minimal preset →", `#/presets/${item.id}`, "text-link"),
  );
  return card;
}
