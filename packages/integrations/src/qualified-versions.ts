/**
 * Qualified direct versions researched on 2026-09-23 from the public npm and
 * PyPI registries, plus the engine ranges those releases publish.
 *
 * Generators and direct dependencies are exact. Transitive dependencies stay
 * in the package-manager lockfile that must travel with a recipe record.
 * Packages with native code (better-sqlite3, Prisma engines) are not
 * byte-identical across operating systems or CPU architectures.
 *
 * Versions that were current but incompatible with Node 22.12 and Node 24
 * together are not qualified:
 * - eslint 10.11.0 requires ^20.19 || ^22.13 || >=24, which rejects Node 22.12.
 *   ESLint 9.39.5 is the npm `maintenance` release and uses the same flat-config
 *   shape documented at https://eslint.org/docs/latest/use/getting-started.
 * - jsdom 30.1.1 requires ^22.22 || ^24.15 || >=26. jsdom 28.1.0 still allows
 *   ^20.19 || ^22.12 || >=24.
 * - typescript 7.0.2 is current latest. The generated Express tsconfig uses
 *   TypeScript 5.8 options, so the pin is the newest 5.x release, 5.9.3.
 * - @types/node 26.6.2 types a newer runtime than the Node 22/24 hosts. 22.20.4
 *   is the last published 22.x.
 * - prisma 8.0.0-rc.15 requires Node >=22.18. The official SQLite quickstart
 *   still installs prisma@prev and @prisma/client@7; on this date those tags
 *   resolve to 7.10.0. https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite
 */
export const REGISTRY_REVISION = "2026-09-23";

export const QUALIFIED_VERSIONS = {
  createNextApp: "16.3.5",
  eslintConfigNext: "16.3.5",
  vite: "8.3.0",
  eslint: "9.39.5",
  eslintJs: "9.39.5",
  typescriptEslint: "8.70.1",
  shadcn: "4.21.0",
  createPlaywright: "1.17.139",
  playwrightTest: "1.63.0",
  tailwindcss: "4.3.3",
  tailwindVite: "4.3.3",
  tailwindPostcss: "4.3.3",
  postcss: "8.5.28",
  zod: "4.6.5",
  vitest: "5.0.1",
  vitePluginReact: "6.1.1",
  jsdom: "28.1.0",
  testingLibraryReact: "16.3.3",
  testingLibraryDom: "10.4.2",
  viteTsconfigPaths: "6.1.1",
  prettier: "3.9.8",
  express: "5.2.1",
  typescript: "5.9.3",
  typesExpress: "5.0.6",
  typesNode: "22.20.4",
  prisma: "7.10.0",
  prismaClient: "7.10.0",
  prismaAdapterSqlite: "7.10.0",
  prismaAdapterPg: "7.10.0",
  dotenv: "18.0.3",
  pg: "8.23.0",
  typesBetterSqlite3: "9.6.0",
  typesPg: "8.23.1",
  fastify: "5.12.5",
  mongoose: "9.10.2",
  drizzleOrm: "0.45.3",
  drizzleKit: "0.31.11",
  tsx: "4.23.15",
  fastapi: "0.141.1",
  flask: "3.1.3",
  pydantic: "2.13.5",
  sqlalchemy: "2.0.54",
  alembic: "1.20.0",
  pytest: "9.1.1",
  ruff: "0.16.8",
} as const;

/** Engine ranges copied from the pinned release metadata. */
export const NODE_ENGINE_RANGES = {
  createNextApp: ">=20.9.0",
  vite: "^20.19.0 || >=22.12.0",
  eslint: "^18.18.0 || ^20.9.0 || >=21.1.0",
  shadcn: ">=20.18.1",
  vitest: "^22.12.0 || ^24.0.0 || >=26.0.0",
  jsdom: "^20.19.0 || ^22.12.0 || >=24.0.0",
  vitePluginReact: "^20.19.0 || >=22.12.0",
} as const;

export const QUALIFIED_PEERS = [
  {
    package: "@tailwindcss/vite@4.3.3",
    peers: "vite ^5.2.0 || ^6 || ^7 || ^8",
    satisfiedBy: "vite@8.3.0",
  },
  {
    package: "@vitejs/plugin-react@6.1.1",
    peers: "vite ^8.0.0",
    satisfiedBy: "vite@8.3.0",
  },
  {
    package: "vitest@5.0.1",
    peers: "vite ^6.4.0 || ^7.0.0 || ^8.0.0",
    satisfiedBy: "vite@8.3.0",
  },
  {
    package: "@testing-library/react@16.3.3",
    peers: "@testing-library/dom ^10.0.0",
    satisfiedBy: "@testing-library/dom@10.4.2",
  },
  {
    package: "@prisma/client@7.10.0",
    peers: "typescript >=5.4.0",
    satisfiedBy: "typescript@5.9.3",
  },
] as const;

export const NATIVE_PACKAGES = ["better-sqlite3", "@prisma/engines", "prisma"] as const;

export function npmPin(name: string, version: string): string {
  return `${name}@${version}`;
}

export function pypiPin(name: string, version: string): string {
  return `${name}==${version}`;
}

const DIRECT_VERSIONS: Record<string, readonly string[]> = {
  nextjs: [npmPin("create-next-app", QUALIFIED_VERSIONS.createNextApp)],
  "react-vite": [npmPin("vite", QUALIFIED_VERSIONS.vite)],
  eslint: [
    npmPin("eslint", QUALIFIED_VERSIONS.eslint),
    npmPin("@eslint/js", QUALIFIED_VERSIONS.eslintJs),
    npmPin("typescript-eslint", QUALIFIED_VERSIONS.typescriptEslint),
  ],
  shadcn: [npmPin("shadcn", QUALIFIED_VERSIONS.shadcn)],
  playwright: [
    npmPin("create-playwright", QUALIFIED_VERSIONS.createPlaywright),
    npmPin("@playwright/test", QUALIFIED_VERSIONS.playwrightTest),
  ],
  tailwind: [
    npmPin("tailwindcss", QUALIFIED_VERSIONS.tailwindcss),
    npmPin("@tailwindcss/vite", QUALIFIED_VERSIONS.tailwindVite),
    npmPin("@tailwindcss/postcss", QUALIFIED_VERSIONS.tailwindPostcss),
    npmPin("postcss", QUALIFIED_VERSIONS.postcss),
  ],
  zod: [npmPin("zod", QUALIFIED_VERSIONS.zod)],
  vitest: [
    npmPin("vitest", QUALIFIED_VERSIONS.vitest),
    npmPin("@vitejs/plugin-react", QUALIFIED_VERSIONS.vitePluginReact),
    npmPin("jsdom", QUALIFIED_VERSIONS.jsdom),
    npmPin("@testing-library/react", QUALIFIED_VERSIONS.testingLibraryReact),
    npmPin("@testing-library/dom", QUALIFIED_VERSIONS.testingLibraryDom),
    npmPin("vite-tsconfig-paths", QUALIFIED_VERSIONS.viteTsconfigPaths),
  ],
  prettier: [npmPin("prettier", QUALIFIED_VERSIONS.prettier)],
  express: [
    npmPin("express", QUALIFIED_VERSIONS.express),
    npmPin("typescript", QUALIFIED_VERSIONS.typescript),
    npmPin("@types/express", QUALIFIED_VERSIONS.typesExpress),
    npmPin("@types/node", QUALIFIED_VERSIONS.typesNode),
  ],
  prisma: [
    npmPin("prisma", QUALIFIED_VERSIONS.prisma),
    npmPin("@prisma/client", QUALIFIED_VERSIONS.prismaClient),
    npmPin("@prisma/adapter-better-sqlite3", QUALIFIED_VERSIONS.prismaAdapterSqlite),
    npmPin("@prisma/adapter-pg", QUALIFIED_VERSIONS.prismaAdapterPg),
  ],
  fastify: [npmPin("fastify", QUALIFIED_VERSIONS.fastify)],
  mongoose: [npmPin("mongoose", QUALIFIED_VERSIONS.mongoose)],
  drizzle: [
    npmPin("drizzle-orm", QUALIFIED_VERSIONS.drizzleOrm),
    npmPin("drizzle-kit", QUALIFIED_VERSIONS.drizzleKit),
    npmPin("pg", QUALIFIED_VERSIONS.pg),
    npmPin("dotenv", QUALIFIED_VERSIONS.dotenv),
    npmPin("tsx", QUALIFIED_VERSIONS.tsx),
    npmPin("@types/pg", QUALIFIED_VERSIONS.typesPg),
  ],
  fastapi: [`fastapi[standard]==${QUALIFIED_VERSIONS.fastapi}`],
  flask: [pypiPin("Flask", QUALIFIED_VERSIONS.flask)],
  pydantic: [pypiPin("pydantic", QUALIFIED_VERSIONS.pydantic)],
  sqlalchemy: [pypiPin("SQLAlchemy", QUALIFIED_VERSIONS.sqlalchemy)],
  alembic: [pypiPin("alembic", QUALIFIED_VERSIONS.alembic)],
  pytest: [pypiPin("pytest", QUALIFIED_VERSIONS.pytest)],
  ruff: [pypiPin("ruff", QUALIFIED_VERSIONS.ruff)],
};

export function qualifiedDirectVersions(ids: readonly string[]): Record<string, string[]> {
  const selected: Record<string, string[]> = {};
  for (const id of ids) {
    const versions = DIRECT_VERSIONS[id];
    if (versions !== undefined) {
      selected[id] = [...versions];
    }
  }
  return selected;
}
