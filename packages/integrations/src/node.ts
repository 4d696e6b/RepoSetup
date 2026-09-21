import { defineIntegration, VERIFIED_AT } from "./define.js";

export const nodeIntegration = defineIntegration({
  id: "node",
  name: "Node.js",
  category: "runtime",
  description: "Detects the Node.js runtime before project setup.",
  status: "experimental",
  documentationUrl: "https://nextjs.org/docs/app/getting-started/installation",
  keywords: ["nodejs", "javascript", "runtime"],
  verification: {
    verifiedAt: VERIFIED_AT,
    runtimeRange: ">=20.9",
  },
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "This integration is the Node.js runtime." };
    }

    return { supported: true };
  },
  plan() {
    return [
      {
        type: "check_prerequisite",
        id: "node",
        description: "Require Node.js on PATH (Next.js documents a minimum of 20.9).",
      },
    ];
  },
});
