import { defineConfig } from "vite";
import { browserCsp } from "./src/security.js";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "public-browser-boundary",
      transform(_source, id) {
        if (id.includes("/packages/") || id.includes("node:child_process"))
          throw new Error(
            "The public website must consume release JSON, not CLI or core runtime code.",
          );
      },
      transformIndexHtml(html, context) {
        if (!context.bundle) return html;
        return html.replace(
          "<head>",
          `<head><meta http-equiv="Content-Security-Policy" content="${browserCsp}">`,
        );
      },
    },
  ],
});
