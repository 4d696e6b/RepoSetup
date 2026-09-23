export interface PathPrerequisite {
  command: string;
  hint: string;
  minimumVersion?: readonly [major: number, minor: number, patch: number];
}

const PATH_PREREQUISITES = {
  node: {
    command: "node",
    hint: "Install Node.js 20.9 or later from https://nodejs.org and ensure it is on PATH.",
    minimumVersion: [20, 9, 0],
  },
  npm: {
    command: "npm",
    hint: "Install Node.js, which includes npm, and ensure npm is on PATH.",
  },
  pnpm: {
    command: "pnpm",
    hint: "Install pnpm from https://pnpm.io/installation and ensure it is on PATH.",
  },
  python: {
    command: "python",
    hint: "Install Python 3.9 or later from https://www.python.org and ensure python is on PATH. RepoSetup will not install Python.",
    minimumVersion: [3, 9, 0],
  },
  uv: {
    command: "uv",
    hint: "Install uv from https://docs.astral.sh/uv/getting-started/installation/ and ensure uv is on PATH. RepoSetup will not install uv.",
  },
  pip: {
    command: "python",
    hint: "Install Python, which provides python -m pip, and ensure python is on PATH. RepoSetup will not install pip.",
    minimumVersion: [3, 9, 0],
  },
} as const satisfies Record<string, PathPrerequisite>;

export type PathPrerequisiteId = keyof typeof PATH_PREREQUISITES;

export function pathPrerequisite(id: string): PathPrerequisite | undefined {
  if (Object.hasOwn(PATH_PREREQUISITES, id)) {
    return PATH_PREREQUISITES[id as PathPrerequisiteId];
  }

  return undefined;
}
