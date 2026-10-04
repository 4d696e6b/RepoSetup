export const packageName = "@reposetup/registry" as const;

export { createRegistry, type IntegrationRegistry } from "./create-registry.js";
export { validateRegistry, type RegistryValidationResult } from "./validate.js";
export { validateSelection, validateBeginnerCatalog, exportBeginnerCatalog } from "./selection.js";

export { createWebsiteCatalog } from "./public-catalog.js";
export type {
  WebsiteCatalog,
  WebsiteVariant,
  WebsiteGuidance,
  WebsitePreset,
} from "./public-catalog.js";
