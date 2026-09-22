import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["commander", "@inquirer/prompts"],
  noExternal: ["@reposetup/core", "@reposetup/registry", "@reposetup/integrations", "zod"],
});
