import { defineConfig } from "vite";
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
              content:
                "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
            },
            injectTo: "head-prepend",
          },
        ];
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
