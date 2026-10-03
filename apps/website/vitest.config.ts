import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/*.test.ts"], exclude: ["tests/handoff.test.ts"], testTimeout: 30000 },
});
