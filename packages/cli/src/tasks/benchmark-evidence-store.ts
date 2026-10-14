import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import {
  decodeTaskJson,
  inspectTaskBenchmarkFinalEvidence,
  taskContentHash,
  taskFailure,
  validateTaskBenchmarkCampaign,
  validateTaskBenchmarkFinalEvidence,
  type TaskBenchmarkFinalEvidence,
} from "@reposetup/core";
import { verifyVerifierRoot, type VerifierRoot } from "./verifier-read.js";
import {
  capturePrivateTaskStateDirectory,
  readPrivateTaskStateFile,
  syncTaskDirectory,
  writePrivateTaskStateFile,
} from "./run-state-adapter.js";

const missing = (e: unknown) => e instanceof Error && "code" in e && e.code === "ENOENT";
const filename = (a: TaskBenchmarkFinalEvidence) => `${a.fixtureId}-${a.block}-${a.treatment}.json`;
/** Read-only factory; the executor's terminal evaluator recorder invokes retain.
 * Fresh exclusive allocation, immutable bounded metadata, no imported execution authority. */
export async function createTaskBenchmarkEvidenceStore(input: {
  stateRoot: string;
  campaign: unknown;
}) {
  const parsed = validateTaskBenchmarkCampaign(input.campaign);
  if (!parsed.success) return parsed;
  if (parsed.data.provenance !== "offline" || parsed.data.trials.length !== 0)
    return taskFailure(
      "TASK_BENCHMARK_INVALID",
      "Independent retention needs a fresh offline campaign.",
    );
  const campaign = parsed.data,
    campaignId = taskContentHash(campaign);
  let base: VerifierRoot;
  try {
    base = await capturePrivateTaskStateDirectory(input.stateRoot);
  } catch {
    return taskFailure(
      "TASK_SCOPE_VIOLATION",
      "Independent evidence requires a canonical private owned directory.",
    );
  }
  const guardBase = async () => {
    await verifyVerifierRoot(base);
    await capturePrivateTaskStateDirectory(base.path);
  };
  const folderPath = path.join(base.path, `benchmark-evidence-${campaignId.slice(7)}`);
  let folder: VerifierRoot | undefined,
    busy = false;
  const acknowledged: TaskBenchmarkFinalEvidence[] = [];
  const readRecords = async () => {
    await guardBase();
    let observed: VerifierRoot;
    try {
      observed = await capturePrivateTaskStateDirectory(folderPath);
    } catch (e) {
      if (missing(e)) return [];
      throw e;
    }
    const names = (await readdir(folderPath)).sort();
    if (names.length > 75) throw new Error("Inventory bound");
    const artifacts: TaskBenchmarkFinalEvidence[] = [];
    let bytes = 0;
    for (const name of names) {
      const data = await readPrivateTaskStateFile(observed, name);
      if (!data || data.length > 262144 || (bytes += data.length) > 16777216)
        throw new Error("Record bound");
      const decoded = decodeTaskJson(data);
      const checked = decoded.success
        ? validateTaskBenchmarkFinalEvidence({ campaign, artifact: decoded.data })
        : decoded;
      if (!checked.success || filename(checked.data) !== name) throw new Error("Record identity");
      artifacts.push(checked.data);
    }
    await verifyVerifierRoot(observed);
    await capturePrivateTaskStateDirectory(folderPath);
    if (taskContentHash((await readdir(folderPath)).sort()) !== taskContentHash(names))
      throw new Error("Inventory drift");
    await guardBase();
    return artifacts;
  };
  const inspect = async (events: unknown) => {
    try {
      return inspectTaskBenchmarkFinalEvidence({
        campaign,
        events,
        artifacts: await readRecords(),
      });
    } catch {
      return taskFailure(
        "TASK_BENCHMARK_INVALID",
        "Retained independent evidence is incomplete, changed or unsafe.",
      );
    }
  };
  const retain = async (request: { events: unknown; artifact: unknown }) => {
    if (busy)
      return taskFailure(
        "TASK_EXECUTION_LOCKED",
        "Independent evidence retention is already active.",
      );
    busy = true;
    try {
      const checked = validateTaskBenchmarkFinalEvidence({ campaign, artifact: request.artifact });
      if (!checked.success) return checked;
      const current = await readRecords();
      const ordered = (rows: TaskBenchmarkFinalEvidence[]) =>
        [...rows].sort((a, b) => filename(a).localeCompare(filename(b)));
      if (taskContentHash(ordered(current)) !== taskContentHash(ordered(acknowledged)))
        return taskFailure(
          "TASK_STATE_CONFLICT",
          "Independent records changed; imported records cannot resume retention.",
        );
      const next = inspectTaskBenchmarkFinalEvidence({
        campaign,
        events: request.events,
        artifacts: [...acknowledged, checked.data],
      });
      if (!next.success) return next;
      // Exactly one terminal observation belongs to the currently executing slot.
      if (
        next.data.unreferenced.length !== 1 ||
        next.data.unreferenced[0]!.finalEvidenceHash !== checked.data.finalEvidenceHash
      )
        return taskFailure(
          "TASK_STATE_CONFLICT",
          "Terminal evidence requires its pending journal slot.",
        );
      const bytes = Buffer.from(JSON.stringify(checked.data));
      if (
        bytes.length > 262144 ||
        acknowledged.reduce((n, a) => n + Buffer.byteLength(JSON.stringify(a)), bytes.length) >
          16777216
      )
        throw new Error("Record bound");
      await guardBase();
      if (folder === undefined) {
        await mkdir(folderPath, { mode: 0o700 });
        await syncTaskDirectory(base.path);
        folder = await capturePrivateTaskStateDirectory(folderPath);
      }
      await writePrivateTaskStateFile(folder, filename(checked.data), bytes);
      await guardBase();
      acknowledged.push(checked.data);
      return { success: true as const, data: true as const };
    } catch {
      return taskFailure(
        "TASK_STATE_WRITE_FAILED",
        "Independent retention stopped; preserve partial records for review.",
      );
    } finally {
      busy = false;
    }
  };
  return { success: true as const, data: { campaignId, folderPath, retain, inspect } };
}
