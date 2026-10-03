import type { RepoSetupConfig } from "@reposetup/core";
import { BEGINNER_CATALOG } from "./beginner-catalog.js";

export interface BundledPreset {
  id: string;
  name: string;
  description: string;
  support: "guaranteed" | "candidate";
  config: RepoSetupConfig;
}

export const BUNDLED_PRESETS: readonly BundledPreset[] = [
  {
    id: "next-sqlite",
    name: "Next.js + SQLite",
    description: "Next.js, Tailwind, Prisma, SQLite, Zod, Vitest, and Prettier.",
    support: "guaranteed",
    config: {
      schemaVersion: 1,
      project: { name: "next-sqlite-app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "nextjs", options: { typescript: true } },
      integrations: [
        { id: "tailwind" },
        { id: "sqlite" },
        { id: "prisma" },
        { id: "zod" },
        { id: "vitest" },
        { id: "prettier" },
      ],
    },
  },
  {
    id: "react-vite",
    name: "React + Vite",
    description: "React, Vite, Tailwind, shadcn, Vitest, ESLint, and Prettier.",
    support: "guaranteed",
    config: {
      schemaVersion: 1,
      project: { name: "react-vite-app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "react-vite", options: { typescript: true } },
      integrations: [
        { id: "tailwind" },
        { id: "shadcn" },
        { id: "vitest" },
        { id: "eslint" },
        { id: "prettier" },
      ],
    },
  },
  {
    id: "express-postgres",
    name: "Express + PostgreSQL",
    description: "Express, PostgreSQL configuration, Prisma, Zod, Docker Compose, and Prettier.",
    support: "guaranteed",
    config: {
      schemaVersion: 1,
      project: { name: "express-postgres-app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "express", options: { typescript: true } },
      integrations: [
        { id: "postgresql" },
        { id: "prisma" },
        { id: "zod" },
        { id: "prettier" },
        { id: "docker" },
        { id: "docker-compose" },
        { id: "github-actions" },
      ],
    },
  },
  {
    id: "fastapi",
    name: "FastAPI",
    description: "FastAPI, Pydantic, SQLAlchemy, Alembic, pytest, Ruff, and Docker Compose.",
    support: "guaranteed",
    config: {
      schemaVersion: 1,
      project: { name: "fastapi-app" },
      runtime: { id: "python" },
      packageManager: "uv",
      framework: { id: "fastapi" },
      integrations: [
        { id: "pydantic" },
        { id: "postgresql" },
        { id: "sqlalchemy" },
        { id: "alembic" },
        { id: "pytest" },
        { id: "ruff" },
        { id: "docker" },
        { id: "docker-compose" },
      ],
    },
  },
  {
    id: "flask",
    name: "Flask",
    description: "Flask, SQLAlchemy, Alembic, pytest, Ruff, and Docker Compose.",
    support: "guaranteed",
    config: {
      schemaVersion: 1,
      project: { name: "flask-app" },
      runtime: { id: "python" },
      packageManager: "uv",
      framework: { id: "flask" },
      integrations: [
        { id: "postgresql" },
        { id: "sqlalchemy" },
        { id: "alembic" },
        { id: "pytest" },
        { id: "ruff" },
        { id: "docker" },
        { id: "docker-compose" },
      ],
    },
  },
];

export function findBundledPreset(id: string): BundledPreset | undefined {
  return [...BUNDLED_PRESETS, ...BEGINNER_PRESETS].find((preset) => preset.id === id);
}

export const BEGINNER_PRESETS: readonly BundledPreset[] = BEGINNER_CATALOG.presets.map(
  (preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.outcome,
    support: preset.support,
    config: preset.config,
  }),
);
