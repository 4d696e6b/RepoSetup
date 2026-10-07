import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const REPOSITORY = "4d696e6b/RepoSetup";
const SHA = /^[0-9a-f]{40}$/;
const OS = ["ubuntu-24.04", "macos-15", "windows-2025"];
export const requiredJobs = [
  ...OS.map((os) => `Platform qualification (${os})`),
  ...OS.flatMap((os) =>
    ["3.12", "3.13"].map((python) => `Recipe qualification (${os}, Python ${python})`),
  ),
  ...OS.map((os) => `Failure-path qualification (${os})`),
  "Pack identified candidate",
  ...OS.map((os) => `Packed artifact acceptance (${os})`),
];

export function parseRunIds(value) {
  const ids = typeof value === "string" ? value.split(",").map((id) => id.trim()) : [];
  if (ids.length !== 3 || ids.some((id) => !/^[1-9][0-9]*$/.test(id)) || new Set(ids).size !== 3) {
    throw new Error("Provide exactly three distinct qualification run IDs, oldest first.");
  }
  return ids;
}

export function validateQualification({
  runs,
  jobs,
  latestRuns,
  artifact,
  sourceSha,
  branchSha,
  now,
}) {
  if (!SHA.test(sourceSha) || branchSha !== sourceSha) {
    throw new Error("Frozen candidate branch and release source must agree.");
  }
  if (runs.length !== 3 || jobs.length !== 3 || new Set(runs.map((run) => run.id)).size !== 3) {
    throw new Error("Three distinct full qualification runs are required.");
  }
  const branch = runs[0].head_branch;
  let completed = 0;
  for (const [index, run] of runs.entries()) {
    if (
      run.repository?.full_name !== REPOSITORY ||
      run.head_repository?.full_name !== REPOSITORY ||
      run.path !== ".github/workflows/release.yml" ||
      run.event !== "workflow_dispatch" ||
      run.head_sha !== sourceSha ||
      run.head_branch !== branch ||
      !branch ||
      run.status !== "completed" ||
      run.conclusion !== "success" ||
      run.run_attempt !== 1 ||
      (index > 0 && run.run_number <= runs[index - 1].run_number)
    ) {
      throw new Error(
        "Qualification must use ordered successful first-attempt runs from the frozen source and official workflow.",
      );
    }
    const updated = Date.parse(run.updated_at);
    if (!Number.isFinite(updated)) throw new Error("Qualification completion time is missing.");
    completed = Math.max(completed, updated);
    const currentJobs = jobs[index];
    if (
      currentJobs.length !== requiredJobs.length ||
      requiredJobs.some((name) => currentJobs.filter((job) => job.name === name).length !== 1)
    ) {
      throw new Error(
        "Qualification is missing a required platform, recipe, fault, pack, or artifact job.",
      );
    }
    for (const job of currentJobs) {
      const time = Date.parse(job.completed_at);
      if (
        job.status !== "completed" ||
        job.conclusion !== "success" ||
        !Number.isFinite(time) ||
        !Array.isArray(job.steps) ||
        job.steps.length === 0 ||
        job.steps.some((step) => step.status !== "completed" || step.conclusion !== "success")
      ) {
        throw new Error("Every required job and step must pass without skips.");
      }
      completed = Math.max(completed, time);
    }
  }
  if (latestRuns.length !== 3 || latestRuns.some((run, index) => run.id !== runs[2 - index].id)) {
    throw new Error(
      "The selected runs must be the latest three consecutive qualifications on this branch.",
    );
  }
  const soakEnd = completed + 7 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(now) || now < soakEnd) {
    throw new Error(
      `Seven-day exact-source soak is incomplete; earliest release ${new Date(soakEnd).toISOString()}.`,
    );
  }
  if (
    !Number.isSafeInteger(artifact?.id) ||
    artifact.id <= 0 ||
    artifact.name !== "candidate-artifact" ||
    artifact.expired !== false ||
    artifact.workflow_run?.id !== runs[2].id ||
    artifact.workflow_run?.head_sha !== sourceSha
  ) {
    throw new Error(
      "The final successful run must retain one unexpired candidate artifact for this source.",
    );
  }
  return { artifactId: artifact.id, soakEnd: new Date(soakEnd).toISOString() };
}

async function main() {
  if (
    process.env.GITHUB_REPOSITORY !== REPOSITORY ||
    process.env.GITHUB_REF !== "refs/tags/v0.2.0"
  ) {
    throw new Error(
      "Stable publication must be dispatched against the existing v0.2.0 tag in the official repository.",
    );
  }
  const manifest = JSON.parse(await readFile("packages/cli/package.json", "utf8"));
  if (manifest.name !== "rsetup" || manifest.version !== "0.2.0") {
    throw new Error("Stable tag requires rsetup@0.2.0.");
  }
  const ids = parseRunIds(process.env.QUALIFICATION_RUN_IDS);
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("An actions:read GitHub token is required.");
  async function api(endpoint) {
    const response = await globalThis.fetch(
      `https://api.github.com/repos/${REPOSITORY}/${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: globalThis.AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) throw new Error(`GitHub qualification lookup failed (${response.status}).`);
    return response.json();
  }
  const runs = await Promise.all(ids.map((id) => api(`actions/runs/${id}`)));
  const jobs = await Promise.all(
    ids.map(async (id) => {
      const result = await api(`actions/runs/${id}/jobs?filter=latest&per_page=100`);
      if (result.total_count !== result.jobs?.length)
        throw new Error("Incomplete qualification job response.");
      return result.jobs;
    }),
  );
  const branch = encodeURIComponent(runs[0].head_branch);
  const latest = await api(`actions/workflows/release.yml/runs?branch=${branch}&per_page=3`);
  const ref = await api(`git/ref/heads/${branch}`);
  const artifacts = await api(`actions/runs/${ids[2]}/artifacts?per_page=100`);
  if (artifacts.total_count !== artifacts.artifacts?.length)
    throw new Error("Incomplete artifact response.");
  const candidates = artifacts.artifacts.filter(
    (artifact) => artifact.name === "candidate-artifact",
  );
  if (candidates.length !== 1)
    throw new Error("Exactly one retained candidate artifact is required.");
  const result = validateQualification({
    runs,
    jobs,
    latestRuns: latest.workflow_runs,
    artifact: candidates[0],
    sourceSha: process.env.GITHUB_SHA,
    branchSha: ref.object?.sha,
    now: Date.now(),
  });
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `artifact_id=${result.artifactId}\nrun_id=${ids[2]}\n`,
  );
  process.stdout.write(
    `Qualified source ${process.env.GITHUB_SHA}; soak completed ${result.soakEnd}.\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
