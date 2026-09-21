import { defineIntegration, VERIFIED_AT } from "./define.js";
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
        type: "show_message",
        message: 'Add `@import "tailwindcss";` to app/globals.css.',
        description: "Import Tailwind in the Next.js global stylesheet",
      },
    ];
  },
});
