import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts", "src/tasks/benchmark-store.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["commander", "@inquirer/prompts", "openai"],
  noExternal: ["@reposetup/core", "@reposetup/registry", "@reposetup/integrations", "zod"],
});
