import { defineIntegration, VERIFIED_AT } from "./define.js";

export const npmIntegration = defineIntegration({
  id: "npm",
  name: "npm",
  category: "package-manager",
  description: "Detects npm before installing JavaScript packages.",
  status: "experimental",
  documentationUrl: "https://docs.npmjs.com/cli/v12/commands/npm-install/",
  keywords: ["node", "packages"],
  verification: { verifiedAt: VERIFIED_AT },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "runtime" },
      reason: "npm installs packages for a Node.js project.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node" || context.packageManager !== "npm") {
      return { supported: false, reason: "Selected when the project package manager is npm." };
    }

    return { supported: true };
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "npm",
        description: "Require npm on PATH.",
      },
    ];
  },
});
