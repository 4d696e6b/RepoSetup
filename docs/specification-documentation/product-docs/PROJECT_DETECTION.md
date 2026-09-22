# Project Detection Specification

## Goal

RepoSetup must understand supported existing projects sufficiently to power:
- `add`;
- `stack`;
- `doctor`;
- `export`.

## Detection order

1. locate project root;
2. inspect lockfiles/package manifests;
3. detect package manager;
4. detect runtime/ecosystem;
5. detect framework;
6. detect supported integrations;
7. collect evidence/confidence.

## Node project evidence

Inspect:
- `package.json`;
- `pnpm-lock.yaml`;
- `package-lock.json`;
- `yarn.lock`;
- `bun.lock` / relevant Bun lockfile;
- framework config files;
- known dependencies.

Do not infer package manager from a globally installed tool if a lockfile clearly identifies the project manager.

## Python project evidence

Inspect:
- `pyproject.toml`;
- `uv.lock`;
- `requirements.txt`;
- relevant tool config;
- known package directories/configs.

## Framework examples

### Next.js

Evidence may include:
- `next` dependency;
- `next.config.*`;
- app/pages structure as supporting evidence.

### Vite React

Evidence may include:
- `vite` and React dependencies;
- Vite config;
- React plugin.

### FastAPI

Evidence should rely primarily on declared dependencies/project configuration, not source-code guessing.

## Integration evidence

Each integration owns detection rules where practical.

Example Prisma:
- Prisma package dependency;
- `prisma/schema.prisma`.

Example Tailwind:
- Tailwind dependency;
- framework-specific CSS/config evidence.

## Confidence

Return evidence:

```ts
interface DetectionResult {
  detected: boolean;
  confidence: "certain" | "likely" | "possible";
  evidence: DetectionEvidence[];
}
```

Never hide ambiguous evidence.

## Read-only requirement

Detection never mutates files.
