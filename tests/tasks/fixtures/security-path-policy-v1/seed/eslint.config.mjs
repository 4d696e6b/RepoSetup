import tseslint from "typescript-eslint";
export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: { "no-debugger": "error", "@typescript-eslint/no-explicit-any": "error" },
  },
];
