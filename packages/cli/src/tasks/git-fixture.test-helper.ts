import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDefaultProcessRunner } from "../execution-adapters.js";
import { resolveTaskGitExecutable } from "./git-resolver.js";

/** Test setup only: a disposable baseline commit, never model-generated commits.
 * Git init/commit/environment options: https://git-scm.com/docs/git-init,
 * https://git-scm.com/docs/git-commit, https://git-scm.com/docs/git.
 * Empty templates and filtered environment prevent inherited hooks/config/identity.
 */
export async function createTaskGitFixture(projectRoot: string, parent: string) {
  const executable = await resolveTaskGitExecutable();
  if (!executable) throw new Error("Preinstalled Git is required for offline qualification.");
  const template = path.join(parent, "empty-git-template");
  await mkdir(template);
  await writeFile(path.join(projectRoot, ".gitignore"), "node_modules/\n");
  await writeFile(
    path.join(projectRoot, "pnpm-lock.yaml"),
    "lockfileVersion: '9.0'\nimporters:\n  .: {}\n",
  );
  const runner = createDefaultProcessRunner();
  const git = async (args: string[]) => {
    const result = await runner({
      command: executable,
      args: [
        "--no-optional-locks",
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.untrackedCache=false",
        ...args,
      ],
      cwd: projectRoot,
      env: {
        PATH: path.dirname(executable),
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_TERMINAL_PROMPT: "0",
        GIT_AUTHOR_NAME: "RepoSetup Fixture",
        GIT_AUTHOR_EMAIL: "fixture@example.invalid",
        GIT_COMMITTER_NAME: "RepoSetup Fixture",
        GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      },
      timeoutMs: 10000,
    });
    if (result.exitCode !== 0 || result.timedOut || result.aborted || result.outputTruncated)
      throw new Error("Fixed fixture Git operation failed.");
    return result.stdout;
  };
  await git(["init", "--quiet", `--template=${template}`, "--initial-branch=fixture"]);
  await git(["add", "--", "."]);
  await git(["commit", "--quiet", "--no-gpg-sign", "-m", "Frozen addition baseline"]);
  const baselineCommit = (await git(["rev-parse", "--verify", "HEAD"])).trim();
  if (!/^[a-f0-9]{40}$/.test(baselineCommit)) throw new Error("Fixture commit is invalid.");
  if ((await git(["status", "--porcelain=v1", "--untracked-files=all"])) !== "")
    throw new Error("Fixture baseline is not clean.");
  return { executable, baselineCommit, git };
}
