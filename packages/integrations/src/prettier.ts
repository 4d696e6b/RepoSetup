import { detectNpmPackage, type DetectionContext, type DetectionResult } from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, removePackages } from "./operations.js";
import { mergeVerify, missingAnyFile, missingPackage } from "./verify.js";

const PRETTIER_CONFIG_PATHS = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.js",
  ".prettierrc.mjs",
  "prettier.config.js",
  "prettier.config.mjs",
] as const;

export const prettierIntegration = defineIntegration({
  id: "prettier",
  name: "Prettier",
  category: "formatting",
  description: "Adds Prettier with an exact local version and starter config files.",
  status: "candidate",
  documentationUrl: "https://prettier.io/docs/install",
  keywords: ["format", "style"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  removable: true,
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
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "prettier", PRETTIER_CONFIG_PATHS);
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
  remove(context) {
    return [
      removePackages(context, ["prettier"], {
        description: "Remove Prettier",
      }),
      {
        type: "show_message",
        message:
          "RepoSetup will not delete .prettierrc or .prettierignore. Remove those files yourself if you no longer need them.",
        description: "Leave Prettier config files in place",
      },
    ];
  },
  async verify(context) {
    return mergeVerify([
      missingPackage(context, "prettier"),
      await missingAnyFile(context, PRETTIER_CONFIG_PATHS, "a Prettier config file"),
    ]);
  },
});
