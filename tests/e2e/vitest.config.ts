import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    exclude: [
      // The POSIX task profile has dedicated ordinary and long-running suites.
      "tests/e2e/task-*.test.ts",
      // Packed selection has its own cold-install setup allowance.
      "tests/e2e/selection-matrix.test.ts",
      "tests/e2e/selection-packed.test.ts",
      "tests/e2e/golden.test.ts",
      "tests/e2e/usability-session.test.ts",
      "tests/e2e/selection-create.test.ts",
      "tests/e2e/selection-add.test.ts",
      "tests/e2e/selection-transport.test.ts",
      "tests/e2e/selection-legacy.test.ts",
    ],
    testTimeout: 180_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
