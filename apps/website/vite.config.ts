import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
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
