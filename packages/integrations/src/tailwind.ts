import {
  detectedResult,
  evidence,
  hasPackageDependency,
  notDetected,
  type DetectionContext,
  type DetectionResult,
  type VerificationContext,
  type VerificationResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { firstExistingPath } from "./first-existing.js";
import { addPackages } from "./operations.js";
import { failVerify, mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const POSTCSS_CONFIG_PATHS = ["postcss.config.mjs", "postcss.config.js"] as const;
const GLOBAL_CSS_PATHS = ["app/globals.css", "src/app/globals.css"] as const;

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
  description: "Adds Tailwind CSS v4 using the official Next.js PostCSS or Vite plugin guides.",
  status: "candidate",
  documentationUrl: "https://tailwindcss.com/docs/installation/framework-guides/nextjs",
  keywords: ["css", "postcss", "styling"],
  verification: { verifiedAt: VERIFIED_AT },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Tailwind is added to the scaffolded Next.js or Vite application.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "Tailwind CSS requires Node.js." };
    }

    if (context.frameworkId !== "nextjs" && context.frameworkId !== "react-vite") {
      return {
        supported: false,
        reason: "This phase supports Tailwind with Next.js or React + Vite.",
      };
    }

    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const pkg = context.packageJson;
    const hasTailwind = pkg !== undefined && hasPackageDependency(pkg, "tailwindcss");
    const hasVitePlugin = pkg !== undefined && hasPackageDependency(pkg, "@tailwindcss/vite");
    const postcss = await firstExistingPath(context.files, POSTCSS_CONFIG_PATHS);
    const cssPath = await firstExistingPath(context.files, GLOBAL_CSS_PATHS);
    const css = cssPath === undefined ? undefined : await context.files.readText(cssPath);
    const hasImport = css !== undefined && css.includes('@import "tailwindcss"');

    if (!hasTailwind && postcss === undefined && !hasImport && !hasVitePlugin) {
      return notDetected();
    }

    const items = [];
    if (hasTailwind) {
      items.push(evidence("dependency", "package.json includes tailwindcss", "package.json"));
    }
    if (hasVitePlugin) {
      items.push(evidence("dependency", "package.json includes @tailwindcss/vite", "package.json"));
    }
    if (postcss !== undefined) {
      items.push(evidence("config", `Found ${postcss}`, postcss));
    }
    if (hasImport && cssPath !== undefined) {
      items.push(evidence("file", `${cssPath} imports Tailwind`, cssPath));
    }

    const confidence =
      hasTailwind && (postcss !== undefined || hasImport || hasVitePlugin)
        ? "certain"
        : hasTailwind
          ? "likely"
          : "possible";
    return detectedResult(confidence, items);
  },
  plan(context) {
    if (context.config.framework.id === "react-vite") {
      return [
        addPackages(context, ["tailwindcss", "@tailwindcss/vite"], {
          description: "Install Tailwind CSS and the official Vite plugin",
        }),
        {
          type: "show_message",
          message:
            'Add the @tailwindcss/vite plugin to vite.config and add @import "tailwindcss"; to your CSS. See https://tailwindcss.com/docs/installation/using-vite',
          description: "Point at the official Tailwind Vite plugin steps",
        },
      ];
    }

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
  async verify(context: VerificationContext): Promise<VerificationResult> {
    const cssPath = await firstExistingPath(context.files, GLOBAL_CSS_PATHS);
    const css = cssPath === undefined ? undefined : await context.files.readText(cssPath);
    const missingImport =
      cssPath !== undefined && (css === undefined || !css.includes('@import "tailwindcss"'))
        ? failVerify(
            `${cssPath} does not import Tailwind.`,
            `Add @import "tailwindcss"; to ${cssPath}. Doctor does not edit CSS.`,
          )
        : undefined;
    const hasVitePlugin =
      context.packageJson !== undefined &&
      hasPackageDependency(context.packageJson, "@tailwindcss/vite");
    const missingPostcss = hasVitePlugin
      ? undefined
      : await missingAnyFile(
          context,
          POSTCSS_CONFIG_PATHS,
          "a Tailwind PostCSS config (postcss.config.mjs or postcss.config.js)",
        );

    return mergeVerify([missingPackage(context, "tailwindcss"), missingPostcss, missingImport]);
  },
});
