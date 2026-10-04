import type { WebsiteCatalog } from "@reposetup/registry";
import generated from "./generated/catalog.json";
export const catalog: WebsiteCatalog = generated as WebsiteCatalog;
export { handoff } from "./handoff.js";
