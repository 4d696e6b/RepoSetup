import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import {
  cleanupWorkspace,
  createTempWorkspace,
  keepOnFailure,
  runNodeCli,
  snapshotTree,
} from "./harness.js";
import { prepareSelectionArtifact } from "./selection-artifact.js";

let artifactRoot: string;
let artifact: Awaited<ReturnType<typeof prepareSelectionArtifact>>;
const roots: string[] = [];

beforeAll(async () => {
  artifactRoot = await createTempWorkspace("reposetup-maintenance-pack-");
  artifact = await prepareSelectionArtifact(artifactRoot);
});
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => cleanupWorkspace(root, keepOnFailure())));
});
afterAll(async () => {
  if (artifactRoot) await cleanupWorkspace(artifactRoot, keepOnFailure());
});

async function fixture() {
  const root = await createTempWorkspace("reposetup-maintenance-");
  roots.push(root);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "app",
      dependencies: { react: "19.0.0", vite: "8.3.0" },
      devDependencies: { prettier: "3.9.8" },
    }),
  );
  await writeFile(path.join(root, "vite.config.ts"), "export default {};\n");
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(
    path.join(root, "reposetup.json"),
    JSON.stringify({
      schemaVersion: 1,
      project: { name: "app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: "react-vite" },
      integrations: [{ id: "prettier" }],
    }),
  );
  await writeFile(path.join(root, "notes.txt"), "user notes\n");
  await writeFile(path.join(root, ".env"), "SECRET_TOKEN=private-fixture-value\n");
  await writeFile(path.join(root, ".env.example"), "SECRET_TOKEN=replace-me\n");
  return root;
}

async function run(root: string, ...args: string[]) {
  return runNodeCli(artifact.bin, ["--json", "doctor", "--config", "reposetup.json", ...args], {
    cwd: root,
  });
}

it("previews, refuses without consent, repairs once and preserves user files", async () => {
  const root = await fixture();
  const before = await snapshotTree(root);
  const preview = await run(root, "--fix", "--dry-run");
  expect(JSON.parse(preview.stdout).repair).toMatchObject({
    planned: 1,
    executed: 0,
    dryRun: true,
  });
  expect(await snapshotTree(root)).toEqual(before);
  const refusal = await run(root, "--fix");
  expect(refusal.exitCode).not.toBe(0);
  expect(await snapshotTree(root)).toEqual(before);
  const confirmed = await run(root, "--fix", "--yes");
  expect(confirmed.exitCode, confirmed.stderr + confirmed.stdout).toBe(0);
  expect(JSON.parse(confirmed.stdout).repair).toMatchObject({ planned: 1, executed: 1 });
  const repaired = await snapshotTree(root);
  expect(repaired[".prettierrc"]).toBe('{\n  "singleQuote": true,\n  "semi": false\n}\n');
  for (const [name, content] of Object.entries(before)) expect(repaired[name]).toBe(content);
  const repeat = await run(root, "--fix", "--yes");
  expect(repeat.exitCode, repeat.stderr + repeat.stdout).toBe(0);
  expect(JSON.parse(repeat.stdout).repair).toMatchObject({ planned: 0, executed: 0 });
  expect(await snapshotTree(root)).toEqual(repaired);
  for (const result of [preview, refusal, confirmed, repeat]) {
    expect(result.stdout + result.stderr).not.toContain("private-fixture-value");
  }
});

it("preserves an alternative config and refuses malformed or linked repair targets", async () => {
  const root = await fixture();
  await writeFile(path.join(root, ".prettierrc.json"), '{"printWidth": 80}\n');
  const alternative = await run(root, "--fix", "--yes");
  expect(alternative.exitCode, alternative.stderr + alternative.stdout).toBe(0);
  expect(JSON.parse(alternative.stdout).repair.planned).toBe(0);
  expect((await snapshotTree(root))[".prettierrc"]).toBeUndefined();
  const original = await readFile(path.join(root, "reposetup.json"), "utf8");
  await writeFile(path.join(root, "reposetup.json"), '{"schemaVersion":1,"project":{');
  const malformed = await run(root, "--fix", "--yes");
  expect(malformed.exitCode).not.toBe(0);
  expect(await readFile(path.join(root, ".prettierrc.json"), "utf8")).toBe('{"printWidth": 80}\n');
  await writeFile(path.join(root, "reposetup.json"), original);
  await rm(path.join(root, ".prettierrc.json"));
  await mkdir(path.join(root, "elsewhere"));
  await writeFile(path.join(root, "elsewhere", "outside.txt"), "keep\n");
  await symlink(path.join(root, "elsewhere", "outside.txt"), path.join(root, ".prettierrc"));
  const linked = await run(root, "--fix", "--yes");
  expect(JSON.parse(linked.stdout).repair).toMatchObject({ planned: 0, executed: 0 });
  expect(await readFile(path.join(root, "elsewhere", "outside.txt"), "utf8")).toBe("keep\n");
});
