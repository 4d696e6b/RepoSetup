import { describe, expect, it } from "vitest";
import {
  stackRecipeFacts,
  tabletDeviceLayout,
  tabletStoryFrame,
} from "../src/reference/stack-scene.js";
import { experimentalIngredients, release } from "../src/reference/release.js";

describe("automatic stack display facts", () => {
  it("keeps the entire tablet bezel in view at the largest reading scale with space for its caption", () => {
    for (const [width, height] of [
      [320, 536],
      [390, 812],
      [672, 820],
      [1344, 618],
      [1344, 820],
      [1560, 820],
    ]) {
      const { size, left, top } = tabletDeviceLayout(width!, height!);
      // Measured artwork bezel: x 28–85%, y 6–84%. Read scale is 1.2.
      // This assertion uses the physical bezel, beyond the HTML screen bounds.
      const bezel = {
        left: left - size * 0.22 * 1.2,
        right: left + size * 0.35 * 1.2,
        top: top - size * 0.44 * 1.2,
        bottom: top + size * 0.34 * 1.2,
      };
      expect(bezel.left).toBeGreaterThanOrEqual(6);
      expect(bezel.right).toBeLessThanOrEqual(width! - 6);
      expect(bezel.top).toBeGreaterThanOrEqual(6);
      expect(bezel.bottom).toBeLessThanOrEqual(height! - 60);
    }
  });
  it("pulls back for each swipe and returns to a readable view of the next information screen", () => {
    expect(tabletStoryFrame(0)).toMatchObject({
      zoom: 0,
      offset: 0,
      swipe: 0,
      chapter: "overview",
    });
    expect(tabletStoryFrame(0.24)).toMatchObject({ zoom: 1, offset: 0, chapter: "overview" });
    expect(tabletStoryFrame(0.38).zoom).toBeCloseTo(0);
    expect(tabletStoryFrame(0.38).swipe).toBeGreaterThan(0.5);
    expect(tabletStoryFrame(0.54)).toMatchObject({
      zoom: 1,
      offset: 1,
      swipe: 0,
      chapter: "presets",
    });
    expect(tabletStoryFrame(0.7).zoom).toBeCloseTo(0);
    expect(tabletStoryFrame(0.7).swipe).toBeGreaterThan(0.5);
    expect(tabletStoryFrame(0.9)).toMatchObject({ zoom: 1, offset: 2, swipe: 0, chapter: "docs" });
    expect(tabletStoryFrame(-1)).toEqual(tabletStoryFrame(0));
    expect(tabletStoryFrame(2)).toEqual(tabletStoryFrame(1));
    expect(tabletStoryFrame(Number.NaN)).toEqual(tabletStoryFrame(0));
    let previousOffset = -1;
    for (let step = 0; step <= 1000; step += 1) {
      const frame = tabletStoryFrame(step / 1000);
      expect(frame.zoom).toBeGreaterThanOrEqual(0);
      expect(frame.zoom).toBeLessThanOrEqual(1);
      expect(frame.swipe).toBeGreaterThanOrEqual(0);
      expect(frame.swipe).toBeLessThanOrEqual(1);
      expect(frame.offset).toBeGreaterThanOrEqual(previousOffset);
      previousOffset = frame.offset;
    }
  });
  it("explains only the exact published bundled recipes and their experimental ingredients", () => {
    const before = JSON.stringify(release);
    for (const preset of release.presets) {
      const facts = stackRecipeFacts(preset.id)!;
      expect(facts.name).toBe(preset.name);
      expect(facts.description).toBe(preset.description);
      expect(facts.runtime).toBe(preset.config.runtime.id);
      expect(facts.packageManager).toBe(preset.config.packageManager);
      expect(facts.ingredients.map((item) => item.id)).toEqual(
        preset.config.integrations.map((item) => item.id),
      );
      for (const ingredient of facts.ingredients)
        expect(ingredient.name).toBe(
          release.integrations.find((item) => item.id === ingredient.id)!.name,
        );
      expect(facts.experimental).toEqual(experimentalIngredients(preset).map((item) => item.name));
      facts.ingredients.pop();
      facts.experimental.push("Not a registry fact");
    }
    expect(JSON.stringify(release)).toBe(before);
    expect(stackRecipeFacts("next-minimal")).toBeNull();
    expect(stackRecipeFacts("<script>")).toBeNull();
  });
});
