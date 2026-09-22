import {
  detectedResult,
  evidence,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration } from "./define.js";
import { supportsNodeOrPython } from "./python-support.js";

export const dockerIntegration = defineIntegration({
  id: "docker",
  name: "Docker",
  category: "infrastructure",
  description: "Documents Docker as a prerequisite. RepoSetup does not install Docker.",
  status: "experimental",
  documentationUrl: "https://docs.docker.com/get-docker/",
  keywords: ["container", "infrastructure"],
  verification: { verifiedAt: "2026-09-22" },
  supports(context) {
    return supportsNodeOrPython(context);
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const dockerfile = await context.files.exists("Dockerfile");
    if (!dockerfile) {
      return notDetected();
    }

    return detectedResult("likely", [evidence("file", "Found Dockerfile", "Dockerfile")]);
  },
  plan() {
    return [
      {
        type: "show_message",
        message:
          "Install Docker from https://docs.docker.com/get-docker/ and ensure docker is on PATH. RepoSetup will not install Docker or start containers.",
        description: "Explain that Docker is a system prerequisite",
      },
    ];
  },
  async verify() {
    return { ok: true };
  },
});
