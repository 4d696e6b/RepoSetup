import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    exclude: [
      // Task qualification has dedicated serial offline/full-verifier release jobs.
      "tests/e2e/task-*.test.ts",
      "tests/e2e/golden.test.ts",
      "tests/e2e/usability-session.test.ts",
      "tests/e2e/selection-create.test.ts",
      "tests/e2e/selection-add.test.ts",
      "tests/e2e/selection-transport.test.ts",
      "tests/e2e/selection-legacy.test.ts",
      "tests/e2e/create-solutions.test.ts",
      "tests/e2e/live-services.test.ts",
    ],
    testTimeout: 180_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
