import {
  createDetectionContext,
  createMemoryDetectionFs,
  type VerificationContext,
} from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { nextjsIntegration } from "./nextjs.js";
import { prettierIntegration } from "./prettier.js";
import { prismaIntegration } from "./prisma.js";
import { sqliteIntegration } from "./sqlite.js";
import { tailwindIntegration } from "./tailwind.js";
import { vitestIntegration } from "./vitest.js";
import { zodIntegration } from "./zod.js";

async function contextOf(files: Record<string, string>): Promise<VerificationContext> {
  return createDetectionContext("/virtual/fixture", createMemoryDetectionFs(files));
}

describe("integration verify", () => {
  it("fails Next.js when the next package is missing", async () => {
    const result = await nextjsIntegration.verify?.(
      await contextOf({
        "package.json": JSON.stringify({ name: "app" }),
        "next.config.mjs": "export default {};\n",
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        message: "package.json does not include next.",
      }),
    );
  });

  it("fails Next.js when next.config is missing", async () => {
    const result = await nextjsIntegration.verify?.(
      await contextOf({
        "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        message: expect.stringContaining("next.config"),
      }),
    );
  });

  it("passes Next.js when the package and config exist", async () => {
    const result = await nextjsIntegration.verify?.(
      await contextOf({
        "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }),
        "next.config.mjs": "export default {};\n",
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("fails Tailwind when PostCSS config is missing", async () => {
    const result = await tailwindIntegration.verify?.(
      await contextOf({
        "package.json": JSON.stringify({ dependencies: { tailwindcss: "4.0.0" } }),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        message: expect.stringContaining("PostCSS config"),
      }),
    );
  });

  it("fails Prisma when DATABASE_URL is missing from .env.example", async () => {
    const result = await prismaIntegration.verify?.(
      await contextOf({
        "package.json": JSON.stringify({
          dependencies: { "@prisma/client": "7.10.0", prisma: "7.10.0" },
        }),
        "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        message: expect.stringContaining(".env.example is missing DATABASE_URL."),
      }),
    );
  });

  it("fails Prisma when generated client output is missing", async () => {
    const result = await prismaIntegration.verify?.(
      await contextOf({
        "package.json": JSON.stringify({
          dependencies: { "@prisma/client": "7.10.0", prisma: "7.10.0" },
        }),
        "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
        ".env.example": "DATABASE_URL=file:./dev.db\n",
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        message: expect.stringContaining("generated Prisma Client output"),
      }),
    );
  });

  it("fails Prisma when packages are missing", async () => {
    const result = await prismaIntegration.verify?.(
      await contextOf({
        "package.json": JSON.stringify({ name: "app" }),
        "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
        ".env.example": "DATABASE_URL=file:./dev.db\n",
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        message: expect.stringContaining("package.json does not include prisma or @prisma/client."),
      }),
    );
  });

  it("fails SQLite when the schema provider is not sqlite", async () => {
    const result = await sqliteIntegration.verify?.(
      await contextOf({
        "prisma/schema.prisma": 'datasource db {\n  provider = "postgresql"\n}\n',
        ".env.example": "DATABASE_URL=file:./dev.db\n",
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        message: 'prisma/schema.prisma does not set provider = "sqlite".',
      }),
    );
  });

  it("fails Zod, Vitest, and Prettier when expected files or packages are missing", async () => {
    const empty = await contextOf({ "package.json": JSON.stringify({ name: "app" }) });

    expect(await zodIntegration.verify?.(empty)).toEqual(
      expect.objectContaining({ ok: false, message: "package.json does not include zod." }),
    );
    expect(await vitestIntegration.verify?.(empty)).toEqual(
      expect.objectContaining({
        ok: false,
        message: expect.stringContaining("vitest"),
      }),
    );
    expect(
      await prettierIntegration.verify?.(
        await contextOf({
          "package.json": JSON.stringify({ devDependencies: { prettier: "3.0.0" } }),
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        message: "Expected a Prettier config file.",
      }),
    );
  });
});
