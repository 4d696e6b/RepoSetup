import {
  detectedResult,
  evidence,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { firstExistingPath } from "./first-existing.js";
import { addPackages } from "./operations.js";

const POSTCSS_CONFIG = `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
`;

export const tailwindIntegration = defineIntegration({
  id: "tailwind",
  name: "Tailwind CSS",
  category: "styling",
  description: "Adds Tailwind CSS v4 to a Next.js app via the official PostCSS plugin.",
  status: "experimental",
  documentationUrl: "https://tailwindcss.com/docs/installation/framework-guides/nextjs",
  keywords: ["css", "postcss", "styling"],
  verification: { verifiedAt: VERIFIED_AT },
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "nextjs" },
      reason: "This phase implements the official Tailwind + Next.js guide.",
    },
  ],
  supports(context) {
    if (context.frameworkId !== "nextjs") {
      return { supported: false, reason: "This phase supports Tailwind with Next.js only." };
    }

    if (context.runtimeId !== "node") {
      return { supported: false, reason: "Tailwind CSS for Next.js requires Node.js." };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const pkg = context.packageJson;
    const hasTailwind = pkg !== undefined && hasPackageDependency(pkg, "tailwindcss");
    const postcss = await firstExistingPath(context.files, [
      "postcss.config.mjs",
      "postcss.config.js",
    ]);
    const cssPath = await firstExistingPath(context.files, [
      "app/globals.css",
      "src/app/globals.css",
    ]);
    const css = cssPath === undefined ? undefined : await context.files.readText(cssPath);
    const hasImport = css !== undefined && css.includes('@import "tailwindcss"');

    if (!hasTailwind && postcss === undefined && !hasImport) {
      return notDetected();
    }

    const items = [];
    if (hasTailwind) {
      items.push(evidence("dependency", "package.json includes tailwindcss", "package.json"));
    }
    if (postcss !== undefined) {
      items.push(evidence("config", `Found ${postcss}`, postcss));
    }
    if (hasImport && cssPath !== undefined) {
      items.push(evidence("file", `${cssPath} imports Tailwind`, cssPath));
    }

    const confidence =
      hasTailwind && (postcss !== undefined || hasImport)
        ? "certain"
        : hasTailwind
          ? "likely"
          : "possible";
    return detectedResult(confidence, items);
  },
  plan(context) {
    return [
      addPackages(context, ["tailwindcss", "@tailwindcss/postcss", "postcss"], {
        description: "Install Tailwind CSS, @tailwindcss/postcss, and postcss",
      }),
      {
        type: "create_file",
        path: "postcss.config.mjs",
        content: POSTCSS_CONFIG,
        behavior: "fail_if_exists",
        description: "Add the official Tailwind PostCSS plugin config",
      },
      {
        type: "modify_text",
        path: "app/globals.css",
        oldText: `:root {
  --background: #ffffff;
  --foreground: #171717;
}`,
        newText: `@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}`,
        description: "Import Tailwind in app/globals.css",
      },
    ];
  },
});
