export const INTEGRATION_CATEGORIES = [
  "runtime",
  "package-manager",
  "framework",
  "backend-framework",
  "styling",
  "ui",
  "database",
  "orm",
  "migration",
  "validation",
  "testing",
  "linting",
  "formatting",
  "infrastructure",
  "ci",
  "utility",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];
