export const packageName = "@reposetup/registry" as const;

export { createRegistry, type IntegrationRegistry } from "./create-registry.js";
export { validateRegistry, type RegistryValidationResult } from "./validate.js";
