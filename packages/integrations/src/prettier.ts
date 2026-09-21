import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages } from "./operations.js";

export const prettierIntegration = defineIntegration({
  id: "prettier",
  name: "Prettier",
  category: "formatting",
  description: "Adds Prettier with an exact local version and starter config files.",
  status: "experimental",
  documentationUrl: "https://prettier.io/docs/install",
  keywords: ["format", "style"],
  verification: { verifiedAt: VERIFIED_AT },
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Prettier is installed into the scaffolded application.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This phase supports Prettier with Node.js only." };
    }

    return { supported: true };
  },
  plan(context) {
    return [
      addPackages(context, ["prettier"], {
        description: "Install Prettier as an exact dev dependency",
        dev: true,
        exact: true,
      }),
      {
        type: "create_file",
        path: ".prettierrc",
        content: "{}\n",
        behavior: "fail_if_exists",
        description: "Add an empty Prettier config so editors detect Prettier",
      },
      {
        type: "create_file",
        path: ".prettierignore",
        content: "# Ignore artifacts:\nbuild\ncoverage\n",
        behavior: "fail_if_exists",
        description: "Ignore build artifacts from Prettier",
      },
    ];
  },
});
