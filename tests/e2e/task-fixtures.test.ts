import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  TASK_BENCHMARK_FIXTURE_IDS,
  taskContentHash,
  validateTaskBenchmarkFixture,
} from "../../packages/core/dist/index.js";
import { fixtureManifest, fixtureRoot } from "../tasks/fixture-tools.js";
import { qualifyFixture } from "../tasks/fixture-qualification.js";
describe("frozen task fixture and independent holdout qualification", () => {
  for (const fixtureId of TASK_BENCHMARK_FIXTURE_IDS)
    it(`${fixtureId}: discriminates seed, reference and every advertised mutation`, async () => {
      const saved = JSON.parse(
        await readFile(path.join(fixtureRoot, fixtureId, "manifest.json"), "utf8"),
      );
      const manifest = validateTaskBenchmarkFixture(saved);
      expect(manifest.success).toBe(true);
      if (!manifest.success) throw new Error(manifest.error.message);
      expect(taskContentHash(await fixtureManifest(fixtureId))).toBe(
        taskContentHash(manifest.data),
      );
      const seed = await qualifyFixture(manifest.data, "seed");
      expect(seed.typecheck).toBe(true);
      expect(seed.compatibility?.passed).toBe(true);
      expect(seed.holdout?.passed).toBe(false);
      const reference = await qualifyFixture(manifest.data, "reference");
      expect(reference.typecheck).toBe(true);
      expect(reference.typeContract).toBe(true);
      expect(reference.compatibility?.passed).toBe(true);
      expect(reference.publicAcceptance?.passed).toBe(true);
      expect(reference.holdout?.passed).toBe(true);
      for (const variant of manifest.data.incorrectVariants) {
        const result = await qualifyFixture(manifest.data, variant.variantId);
        expect(
          result.typecheck && result.typeContract && result.holdout?.passed,
          `${fixtureId}/${variant.variantId}`,
        ).not.toBe(true);
      }
    }, 120000);
});
