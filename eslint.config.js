import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "coverage/**",
      "apps/website/.published-cli/**",
      "apps/website/test-results/**",
      "apps/website/playwright-report/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
);
