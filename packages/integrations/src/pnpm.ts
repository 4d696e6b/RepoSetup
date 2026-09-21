import { defineIntegration, VERIFIED_AT } from "./define.js";

export const pnpmIntegration = defineIntegration({
  id: "pnpm",
  name: "pnpm",
  category: "package-manager",
  description: "Detects pnpm before installing JavaScript packages.",
  status: "experimental",
  documentationUrl: "https://pnpm.io/cli/add",
  keywords: ["node", "packages"],
  verification: { verifiedAt: VERIFIED_AT },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "pnpm installs packages for a Node.js project.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node" || context.packageManager !== "pnpm") {
      return { supported: false, reason: "Selected when the project package manager is pnpm." };
    }

    return { supported: true };
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "pnpm",
        description: "Require pnpm on PATH.",
      },
    ];
  },
});
