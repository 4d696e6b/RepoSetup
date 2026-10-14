import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Complete immutable-tool qualification runs separately on the POSIX matrix.
    exclude: ["src/tasks/verification-adapter.test.ts"],
  },
});
