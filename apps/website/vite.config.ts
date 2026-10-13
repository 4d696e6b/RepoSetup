import { defineConfig, type UserConfig } from "vite";
import { rmSync } from "node:fs";
import { publicationForBuild } from "./scripts/verify-publication.ts";
import { browserCsp } from "./src/reference/security.js";
export default defineConfig(async (): Promise<UserConfig> => {
  const publication = await publicationForBuild(process.env.REPOSETUP_WEBSITE_RELEASE);
  return {
    define: { __REPOSETUP_PUBLICATION__: JSON.stringify(publication) },
    plugins: [
      {
        name: "static-preview-browser-policy",
        apply: "build",
        transformIndexHtml(html) {
          return {
            html: publication
              ? html
                  .replace("0.3.0 development", "0.3.0")
                  .replace("blob/v0.2.3/docs/humanOnly/RepoSetup_0.2.3.md", "blob/v0.3.0/README.md")
                  .replace("0.2.3 user guide", "0.3.0 user guide")
              : html,
            tags: [
              {
                tag: "meta",
                attrs: {
                  "http-equiv": "Content-Security-Policy",
                  content: browserCsp,
                },
                injectTo: "head-prepend",
              },
            ],
          };
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
  };
});
