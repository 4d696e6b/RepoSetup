import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import config from "../../../vercel.json";
import { RELEASE_SOURCE } from "../scripts/generate-release.ts";

const temporary: string[] = [];
const approved = "codex/0.2.3-website";
const rejected = [
  "main",
  "codex/0.3.0-cli",
  "codex/0.3.0-website",
  "codex/0.3.1-website-docs",
  "codex/0.2.3-website-copy",
  "$(exit 1)",
  "",
];

afterEach(() =>
  temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);

function run(command: string, branch: string, env: NodeJS.ProcessEnv = {}) {
  return spawnSync("sh", ["-c", command], {
    shell: false,
    encoding: "utf8",
    timeout: 5000,
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    env: { ...process.env, ...env, VERCEL_GIT_COMMIT_REF: branch },
  });
}

function buildFixture(baselinePresent = true) {
  const root = mkdtempSync(join(tmpdir(), "reposetup-vercel-git-"));
  temporary.push(root);
  const log = join(root, "commands.jsonl");
  const record = `require('node:fs').appendFileSync(process.env.COMMAND_LOG, JSON.stringify(process.argv.slice(1)) + '\\n');`;
  writeFileSync(
    join(root, "git"),
    `#!/usr/bin/env node\n${record}\nif (process.argv[2] === 'cat-file') process.exit(${baselinePresent ? 0 : 1});\n`,
    { mode: 0o755 },
  );
  writeFileSync(join(root, "npx"), `#!/usr/bin/env node\n${record}\n`, { mode: 0o755 });
  return {
    root,
    log,
    env: { PATH: `${root}${delimiter}${process.env.PATH ?? ""}`, COMMAND_LOG: log },
    commands: () =>
      existsSync(log)
        ? readFileSync(log, "utf8")
            .trim()
            .split("\n")
            .map((line) => (JSON.parse(line) as string[]).slice(1))
        : [],
  };
}

describe("Vercel Git deployment boundary", () => {
  it("allows only the published website branch and declares the checked static artifact", () => {
    expect(config.git.deploymentEnabled).toEqual({ "**": false, [approved]: true });
    expect(config.framework).toBeNull();
    expect(config.outputDirectory).toBe(".vercel/output/static");
    expect(config.buildCommand.length).toBeLessThanOrEqual(256);
    expect(config.installCommand.length).toBeLessThanOrEqual(256);
    const workspace = JSON.parse(
      readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
    ) as { packageManager: string };
    expect(config.installCommand).toBe(
      `npx --yes ${workspace.packageManager} install --frozen-lockfile --prod=false`,
    );
  });

  it("uses only supported fields from the official Vercel configuration schema", () => {
    // Restrict this app to the reviewed subset of https://openapi.vercel.sh/vercel.json.
    const schema = z.strictObject({
      $schema: z.literal("https://openapi.vercel.sh/vercel.json"),
      framework: z.null(),
      installCommand: z.string().max(256),
      buildCommand: z.string().max(256),
      outputDirectory: z.string().max(256),
      ignoreCommand: z.string().max(256),
      git: z.strictObject({ deploymentEnabled: z.record(z.string(), z.boolean()) }),
    });
    expect(schema.safeParse(config).success).toBe(true);
    expect(schema.safeParse({ ...config, public: false }).success).toBe(false);
  });

  it("the ignored build step proceeds only for the exact approved branch", () => {
    expect(run(config.ignoreCommand, approved).status).toBe(1);
    for (const branch of rejected) expect(run(config.ignoreCommand, branch).status, branch).toBe(0);
  });

  it("the build gate rejects missing or candidate branch metadata before any Git or package command", () => {
    const fixture = buildFixture();
    for (const branch of rejected) {
      const result = run(config.buildCommand, branch, fixture.env);
      expect(result.status, branch).toBe(1);
      expect(result.stderr).toContain("Refusing website build from an unapproved branch");
    }
    expect(fixture.commands()).toEqual([]);
  });

  it.each([true, false])(
    "builds workspace dependencies and the website before preparing the artifact (baseline present: %s)",
    (baselinePresent) => {
      const fixture = buildFixture(baselinePresent);
      expect(run(config.buildCommand, approved, fixture.env).status).toBe(0);
      expect(fixture.commands()).toEqual([
        ["cat-file", "-e", `${RELEASE_SOURCE}^{commit}`],
        ...(!baselinePresent ? [["fetch", "--depth=1", "origin", RELEASE_SOURCE]] : []),
        [
          "--yes",
          "pnpm@12.5.1",
          "--filter",
          "@reposetup/website...",
          "--recursive",
          "--if-present",
          "build",
        ],
        ["--yes", "pnpm@12.5.1", "--filter", "@reposetup/website", "vercel:prepare"],
      ]);
    },
  );
});
