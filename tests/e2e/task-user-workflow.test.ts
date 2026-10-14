import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { taskGuides } from "../../apps/website/src/reference/docs/task-guides.js";
import { taskByteHash } from "../../packages/core/dist/index.js";
import { createDefaultProcessRunner } from "../../packages/cli/src/execution-adapters.js";
import { inventory, workspaceRoot } from "../tasks/fixture-tools.js";
import { portableFixture } from "../tasks/portable-fixture.js";

it("executes the website's complete portable workflow with the built CLI and retains advisory boundaries", async () => {
  const retainedRoot = process.env.REPOSETUP_TASK_WORKFLOW_ENV;
  const environment = await realpath(retainedRoot ?? tmpdir());
  const relative = path.relative(await realpath(workspaceRoot), environment);
  if (retainedRoot && (!path.isAbsolute(retainedRoot) || !relative.startsWith(`..${path.sep}`))) {
    throw new Error(
      "Retained workflow environment must be an existing directory outside the checkout.",
    );
  }
  const root = await mkdtemp(path.join(environment, "user-workflow-"));
  const runner = createDefaultProcessRunner();
  // No real provider credential or user configuration enters these child processes.
  const env = { PATH: process.env.PATH ?? "", LANG: "C", LC_ALL: "C", TZ: "UTC", CI: "1" };
  const steps: { section: string; exitCode: number; stdoutHash: string; stderrHash: string }[] = [];
  const execute = async (args: string[], cwd: string) => {
    const result = await runner({ command: process.execPath, args, cwd, env, timeoutMs: 30000 });
    expect(Boolean(result.timedOut || result.aborted || result.outputTruncated)).toBe(false);
    return result;
  };
  try {
    const f = await portableFixture(root);
    await writeFile(path.join(root, "task-review.json"), await readFile(f.reviewPath));
    await writeFile(path.join(root, "task-draft.json"), await readFile(f.draftPath));
    const before = await inventory(f.project);
    const bin = path.join(workspaceRoot, "packages/cli/dist/bin.js");
    const prefix = "node /absolute/path/to/RepoSetup/packages/cli/dist/bin.js ";
    for (const section of taskGuides[0]!.sections) {
      for (const line of section.code?.split("\n") ?? []) {
        if (!line.startsWith(prefix)) continue;
        // Only checked-in guide examples; no shell evaluation or external commands.
        const [command, redirect] = line.slice(prefix.length).split(" > ");
        const args = command!.split(" ");
        expect(args[0]).toBe("task");
        expect(["--help", "compile", "next", "status"]).toContain(args[1]);
        const result = await execute([bin, ...args], f.project);
        expect(result.exitCode, `${section.id}: ${result.stdout}${result.stderr}`).toBe(
          section.id === "decomposition" ? 3 : 0,
        );
        expect(result.stdout + result.stderr).not.toContain("PRIVATE_DENIED_MARKER");
        if (redirect !== undefined) {
          expect(["../task-compilation.json", "../task-packet.json"]).toContain(redirect);
          await writeFile(path.resolve(f.project, redirect), result.stdout);
        }
        if (args.includes("--json")) {
          const output = JSON.parse(result.stdout);
          if (section.id === "decomposition")
            expect(output.error.code).toBe("TASK_DECOMPOSITION_REQUIRED");
          if (section.id === "validate")
            expect(output).toMatchObject({ kind: "task_compilation", baselineGit: "not_checked" });
          if (section.id === "handoff") {
            if (args.includes("--dry-run")) {
              expect(output).toMatchObject({
                kind: "task_handoff_preview",
                runId: null,
                attemptId: null,
              });
              expect(result.stdout).not.toContain("Untrusted fixture text");
            } else {
              expect(output.handoff).toMatchObject({
                recommendedRouting: null,
                enforcement: { scope: "advisory", verification: "unconfirmed" },
              });
              expect(output.handoff.attemptId).toBe(
                "123e4567-e89b-42d3-a456-426614174000/policy/1",
              );
            }
          }
          if (section.id === "status-and-next-phase")
            expect(output).toMatchObject({ kind: "task_status", stateAuthority: "not_recorded" });
        }
        steps.push({
          section: section.id,
          exitCode: result.exitCode,
          stdoutHash: taskByteHash(result.stdout),
          stderrHash: taskByteHash(result.stderr),
        });
        await writeFile(path.join(root, `${section.id}-${steps.length}.stdout`), result.stdout);
        await writeFile(path.join(root, `${section.id}-${steps.length}.stderr`), result.stderr);
        expect(await inventory(f.project)).toEqual(before);
      }
    }
    expect(steps).toHaveLength(6);
    const status = await execute(
      [
        bin,
        "task",
        "status",
        "--root",
        f.project,
        "--review",
        path.join(root, "task-review.json"),
        "--plan",
        path.join(root, "task-compilation.json"),
        "--json",
      ],
      root,
    );
    expect(status.exitCode, status.stdout + status.stderr).toBe(0);
    const guide = await readFile(
      path.join(workspaceRoot, "apps/website/src/reference/docs/task-guides.ts"),
    );
    const report = {
      schemaVersion: 1,
      kind: "task_user_workflow",
      liveQualification: false,
      providerCalls: 0,
      scope:
        "Checked-in portable guide commands, actual CLI/files, zero project effects; agent implementation and managed/live acceptance are separate.",
      host: { platform: process.platform, architecture: process.arch, node: process.version },
      guideHash: taskByteHash(guide),
      steps,
      projectUnchanged: true,
      stateAuthority: "not_recorded",
    };
    await mkdir(path.join(root, "evidence"));
    await writeFile(
      path.join(root, "evidence/report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    process.stdout.write(
      JSON.stringify({ ...report, retainedEnvironment: retainedRoot ? root : null }) + "\n",
    );
  } finally {
    if (!retainedRoot) await rm(root, { recursive: true, force: true });
  }
});
