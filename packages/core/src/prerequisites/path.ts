export interface PathPrerequisite {
  command: string;
  hint: string;
}

const PATH_PREREQUISITES = {
  node: {
    command: "node",
    hint: "Install Node.js 20.9 or later from https://nodejs.org and ensure it is on PATH.",
  },
  npm: {
    command: "npm",
    hint: "Install Node.js, which includes npm, and ensure npm is on PATH.",
  },
  pnpm: {
    command: "pnpm",
    hint: "Install pnpm from https://pnpm.io/installation and ensure it is on PATH.",
  },
} as const satisfies Record<string, PathPrerequisite>;

export type PathPrerequisiteId = keyof typeof PATH_PREREQUISITES;

export function pathPrerequisite(id: string): PathPrerequisite | undefined {
  if (id === "node" || id === "npm" || id === "pnpm") {
    return PATH_PREREQUISITES[id];
  }

  return undefined;
}
