import {
  createDetectionContext,
  createMemoryDetectionFs,
  type DetectionContext,
} from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { nextjsIntegration } from "./nextjs.js";
import { npmIntegration } from "./npm.js";
import { pnpmIntegration } from "./pnpm.js";
import { prettierIntegration } from "./prettier.js";
import { prismaIntegration } from "./prisma.js";
import { sqliteIntegration } from "./sqlite.js";
import { tailwindIntegration } from "./tailwind.js";
import { vitestIntegration } from "./vitest.js";
import { zodIntegration } from "./zod.js";

async function contextOf(files: Record<string, string>): Promise<DetectionContext> {
  return createDetectionContext("/virtual/fixture", createMemoryDetectionFs(files));
}

describe("integration detection", () => {
  it("detects Next.js as certain from the next dependency", async () => {
    const result = await nextjsIntegration.detect?.(
      await contextOf({
        "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }),
        "next.config.mjs": "export default {};\n",
        "app/page.tsx": "export default function Page() {}\n",
      }),
    );

    expect(result).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));
  });

  it("reports Next.js as likely from config without a next dependency", async () => {
    const result = await nextjsIntegration.detect?.(
      await contextOf({
        "package.json": JSON.stringify({ name: "app" }),
        "next.config.mjs": "export default {};\n",
      }),
    );

    expect(result).toEqual(expect.objectContaining({ detected: true, confidence: "likely" }));
  });

  it("detects pnpm from a lockfile and does not detect npm", async () => {
    const context = await contextOf({
      "package.json": JSON.stringify({ name: "app" }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    });

    expect(await pnpmIntegration.detect?.(context)).toEqual(
      expect.objectContaining({ detected: true, confidence: "certain" }),
    );
    expect(await npmIntegration.detect?.(context)).toEqual(
      expect.objectContaining({ detected: false }),
    );
  });

  it("detects Prisma as certain when the package and schema both exist", async () => {
    const result = await prismaIntegration.detect?.(
      await contextOf({
        "package.json": JSON.stringify({ dependencies: { "@prisma/client": "7.10.0" } }),
        "prisma/schema.prisma": 'generator client {\n  provider = "prisma-client"\n}\n',
      }),
    );

    expect(result).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));
  });

  it("detects SQLite as certain from the Prisma provider", async () => {
    const result = await sqliteIntegration.detect?.(
      await contextOf({
        "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
      }),
    );

    expect(result).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));
  });

  it("detects Tailwind from the package plus PostCSS config", async () => {
    const result = await tailwindIntegration.detect?.(
      await contextOf({
        "package.json": JSON.stringify({ dependencies: { tailwindcss: "4.0.0" } }),
        "postcss.config.mjs": "export default {};\n",
        "app/globals.css": '@import "tailwindcss";\n',
      }),
    );

    expect(result).toEqual(expect.objectContaining({ detected: true, confidence: "certain" }));
  });

  it("detects Zod, Vitest, and Prettier from package.json", async () => {
    const context = await contextOf({
      "package.json": JSON.stringify({
        dependencies: { zod: "4.0.0" },
        devDependencies: { vitest: "5.0.0", prettier: "3.0.0" },
      }),
      "vitest.config.mts": "export default {};\n",
      ".prettierrc": "{}\n",
    });

    expect(await zodIntegration.detect?.(context)).toEqual(
      expect.objectContaining({ detected: true, confidence: "certain" }),
    );
    expect(await vitestIntegration.detect?.(context)).toEqual(
      expect.objectContaining({ detected: true, confidence: "certain" }),
    );
    expect(await prettierIntegration.detect?.(context)).toEqual(
      expect.objectContaining({ detected: true, confidence: "certain" }),
    );
  });
});
