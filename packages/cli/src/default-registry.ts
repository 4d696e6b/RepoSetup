import { createRegistry, type IntegrationRegistry } from "@reposetup/registry";

export function createDefaultRegistry(): IntegrationRegistry {
  return createRegistry();
}
