import { BUNDLED_PRESETS, BEGINNER_PRESETS, BEGINNER_CATALOG } from "@reposetup/integrations";
export { BUNDLED_PRESETS, findBundledPreset } from "@reposetup/integrations";
export type { BundledPreset } from "@reposetup/integrations";

export function renderBundledPresets(): string {
  return (
    [...BUNDLED_PRESETS, ...BEGINNER_PRESETS]
      .map(
        (preset) => `${preset.id}\n  ${preset.name} · ${preset.support}\n  ${preset.description}`,
      )
      .join("\n\n") +
    "\n\nStart small: optional libraries are never selected automatically.\n" +
    BEGINNER_CATALOG.contexts
      .map((item) => `${item.id}: optional ${item.optionalIds.join(", ")}\n  ${item.limitations}`)
      .join("\n") +
    "\n\nStarter reasons:\n" +
    BEGINNER_CATALOG.presets
      .map((preset) => `${preset.id}: ${Object.values(preset.reasons).join(" ")}`)
      .join("\n")
  );
}
