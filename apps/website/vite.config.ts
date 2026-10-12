import { defineConfig } from "vite";
import { rmSync } from "node:fs";
import { browserCsp } from "./src/reference/security.js";
export default defineConfig({
  plugins: [
    {
      name: "static-preview-browser-policy",
      apply: "build",
      transformIndexHtml() {
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: browserCsp,
            },
            injectTo: "head-prepend",
          },
        ];
      },
    },
    {
      name: "exclude-private-brand-provenance",
      closeBundle() {
        for (const name of ["README.md", "prompts.json"])
          rmSync(new URL(`./dist/brand/${name}`, import.meta.url), { force: true });
      },
    },
    {
      name: "presentation-only-browser-boundary",
      generateBundle() {
        for (const id of this.getModuleIds()) {
          if (
            id.includes("/packages/") ||
            id.startsWith("node:") ||
            id.includes("__vite-browser-external")
          )
            throw new Error(`Node/workspace runtime capability entered browser bundle: ${id}`);
        }
      },
    },
  ],
});
