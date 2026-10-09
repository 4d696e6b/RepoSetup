import data from "./generated/release.json";
export const release = data;
export const VERSION = "0.2.3";
export const REPOSITORY = "https://github.com/4d696e6b/RepoSetup";
export const RELEASE_URL = `${REPOSITORY}/releases/tag/v0.2.3`;
export const INSTALL = "npm install -g rsetup@0.2.3";
export type Integration = (typeof release.integrations)[number];
export type Preset = (typeof release.presets)[number];
export function experimentalIngredients(preset: Preset) {
  const ids = new Set([
    preset.config.runtime.id,
    preset.config.packageManager,
    preset.config.framework.id,
    ...preset.config.integrations.map((item) => item.id),
  ]);
  return release.integrations.filter((item) => ids.has(item.id) && item.status === "experimental");
}
export const categories: Record<string, string> = {
  runtime: "Runtimes",
  "package-manager": "Package managers",
  framework: "Frontend frameworks",
  "backend-framework": "Backend frameworks",
  styling: "Styling",
  ui: "UI components",
  validation: "Validation",
  testing: "Testing",
  database: "Databases",
  orm: "Data access",
  migration: "Database migrations",
  utility: "Application utilities",
  infrastructure: "Infrastructure",
  ci: "CI & automation",
  formatting: "Formatting",
  linting: "Linting",
};
export const categoryName = (category: string) =>
  categories[category] ?? category.replaceAll("-", " ");
