import { appendFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  assertStableReleaseSource,
  readReleaseContext,
  releaseRepository,
  validateReleaseVersion,
} from "./release-context.mjs";

const REPOSITORY = releaseRepository;
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

export function requiredQualificationJobs(version) {
  validateReleaseVersion(version, { stableOnly: true });
  const [major, minor] = version.split(".").map(Number);
  // The task compiler release introduces these mandatory gates. Retain them for
  // later versions so a new minor or major cannot silently bypass task acceptance.
  const tasksRequired = major > 0 || minor >= 4;
  return [
    ...requiredJobs,
    ...(tasksRequired
      ? ["ubuntu-24.04", "macos-15"].flatMap((os) => [
          `Offline task qualification (${os})`,
          `Full task verifier qualification (${os})`,
        ])
      : []),
  ];
}

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
  version = "0.2.3",
}) {
  const required = requiredQualificationJobs(version);
  if (!SHA.test(sourceSha) || branchSha !== sourceSha) {
    throw new Error("Candidate branch and release source must agree.");
  }
  if (runs.length !== 3 || jobs.length !== 3 || new Set(runs.map((run) => run.id)).size !== 3) {
    throw new Error("Three distinct full qualification runs are required.");
  }
  const branch = runs[0].head_branch;
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
        "Qualification must use ordered successful first-attempt runs from the selected source and official workflow.",
      );
    }
    const updated = Date.parse(run.updated_at);
    if (!Number.isFinite(updated)) throw new Error("Qualification completion time is missing.");
    const currentJobs = jobs[index];
    if (
      currentJobs.length !== required.length ||
      required.some((name) => currentJobs.filter((job) => job.name === name).length !== 1)
    ) {
      throw new Error(
        "Qualification is missing a required platform, recipe, fault, pack, artifact, or task job.",
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
    }
  }
  if (latestRuns.length !== 3 || latestRuns.some((run, index) => run.id !== runs[2 - index].id)) {
    throw new Error(
      "The selected runs must be the latest three consecutive qualifications on this branch.",
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
  return { artifactId: artifact.id };
}

async function main() {
  const release = await readReleaseContext({ stableOnly: true });
  assertStableReleaseSource(release, process.env);
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
    version: release.version,
  });
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `artifact_id=${result.artifactId}\nrun_id=${ids[2]}\npackage_version=${release.version}\n`,
  );
  process.stdout.write(
    `Qualified source ${process.env.GITHUB_SHA}; all three exact-source release runs passed.\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
