import { expect, it } from "vitest";
import { taskBinomialBounds } from "./binomial-bounds.js";

// Independent SciPy beta.ppf references; production implements binomial inversion.
it.each([
  [10, 5, 0.025, 0.18708602844739852, 0.8129139715526015],
  [100, 75, 0.05, 0.6686784462543383, 0.8198429532202953],
  [390, 2, 0.05 / 14, 0.00022332023452738292, 0.024599351384069167],
  [10000, 5000, 0.000001, 0.4761969679384918, 0.5238030320614795],
])("matches independent exact beta quantiles: n=%i k=%i", (n, k, alpha, lower, upper) => {
  const result = taskBinomialBounds(k, n, alpha);
  expect(result.lower).toBeCloseTo(lower, 8);
  expect(result.upper).toBeCloseTo(upper, 8);
});
it("preserves nonzero uncertainty for zero disagreements and the paper's precision example", () => {
  const alpha = 0.05 / 14;
  expect(taskBinomialBounds(0, 90, alpha).upper).toBeCloseTo(0.0607, 4);
  expect(taskBinomialBounds(0, 390, alpha).upper).toBeCloseTo(0.0143, 4);
  expect(taskBinomialBounds(0, 90, alpha).lower).toBe(0);
  expect(taskBinomialBounds(90, 90, alpha).upper).toBe(1);
});
it("has conservative endpoints and symmetric success/failure bounds", () => {
  for (let k = 0; k <= 20; k++) {
    const a = taskBinomialBounds(k, 20, 0.01);
    const b = taskBinomialBounds(20 - k, 20, 0.01);
    expect(a.lower).toBeLessThanOrEqual(k / 20);
    expect(a.upper).toBeGreaterThanOrEqual(k / 20);
    expect(a.lower).toBeCloseTo(1 - b.upper, 9);
  }
});
it.each([
  [1, 0, 0.05],
  [2, 1, 0.05],
  [0, 10001, 0.05],
  [1.1, 10, 0.05],
  [1, 10, 0],
  [1, 10, NaN],
])("rejects invalid or unbounded statistical inputs", (k, n, alpha) => {
  expect(() => taskBinomialBounds(k, n, alpha)).toThrow(RangeError);
});
