import { performance } from "node:perf_hooks";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import {
  decodeTaskJson,
  taskContentHash,
  taskContainsPrivateMaterial,
  taskFailure,
  validateTaskBenchmarkCampaign,
  validateTaskBenchmarkJournal,
  type TaskBenchmarkEvent,
  type TaskParseResult,
} from "@reposetup/core";
import { verifyVerifierRoot, type VerifierRoot } from "./verifier-read.js";
import {
  capturePrivateTaskStateDirectory,
  readPrivateTaskStateFile,
  writePrivateTaskStateFile,
  syncTaskDirectory,
} from "./run-state-adapter.js";

const MAX_JOURNAL_BYTES = 16777216;
const missing = (e: unknown) => e instanceof Error && "code" in e && e.code === "ENOENT";
/** Read-only factory. Only the coordinator's retain port allocates/writes immutable records. */
export async function createTaskBenchmarkStore(input: { stateRoot: string; campaign: unknown }) {
  const parsed = validateTaskBenchmarkCampaign(input.campaign);
  if (!parsed.success) return parsed;
  if (parsed.data.trials.length !== 0 || parsed.data.provenance !== "offline")
    return taskFailure(
      "TASK_BENCHMARK_INVALID",
      "Provide a fresh offline campaign for its private journal.",
    );
  const campaign = parsed.data,
    campaignId = taskContentHash(campaign);
  let base: VerifierRoot;
  try {
    base = await capturePrivateTaskStateDirectory(input.stateRoot);
  } catch {
    return taskFailure(
      "TASK_SCOPE_VIOLATION",
      "Benchmark storage requires a canonical private owned directory.",
    );
  }
  const guardBase = async () => {
    await verifyVerifierRoot(base);
    await capturePrivateTaskStateDirectory(base.path);
  };
  const folderPath = path.join(base.path, `benchmark-${campaignId.slice(7)}`);
  let folder: VerifierRoot | undefined,
    busy = false,
    totalBytes = 0;
  const acknowledged: TaskBenchmarkEvent[] = [];
  const inspect = async () => {
    try {
      await guardBase();
      let observed: VerifierRoot;
      try {
        observed = await capturePrivateTaskStateDirectory(folderPath);
      } catch (e) {
        if (missing(e)) return validateTaskBenchmarkJournal({ campaign, events: [] });
        throw e;
      }
      const names = (await readdir(folderPath)).sort();
      if (
        names.length > 250 ||
        names.some((name, i) => name !== `${String(i).padStart(3, "0")}.json`)
      )
        throw new Error("Inventory");
      const events: unknown[] = [];
      let bytes = 0;
      for (const name of names) {
        const data = await readPrivateTaskStateFile(observed, name);
        if (!data || data.length > 262144 || (bytes += data.length) > MAX_JOURNAL_BYTES)
          throw new Error("Bound");
        const decoded = decodeTaskJson(data);
        if (!decoded.success || taskContainsPrivateMaterial(decoded.data))
          throw new Error("Record");
        events.push(decoded.data);
      }
      await verifyVerifierRoot(observed);
      await capturePrivateTaskStateDirectory(folderPath);
      if (taskContentHash((await readdir(folderPath)).sort()) !== taskContentHash(names))
        throw new Error("Inventory changed");
      await guardBase();
      return validateTaskBenchmarkJournal({ campaign, events });
    } catch {
      return taskFailure(
        "TASK_BENCHMARK_INVALID",
        "Private benchmark journal is incomplete, changed or unsafe.",
      );
    }
  };
  const retain = async (event: TaskBenchmarkEvent): Promise<TaskParseResult<true>> => {
    if (busy) return taskFailure("TASK_EXECUTION_LOCKED", "Benchmark storage is already active.");
    busy = true;
    try {
      const next = validateTaskBenchmarkJournal({ campaign, events: [...acknowledged, event] });
      if (!next.success) return next;
      const record = next.data.events.at(-1)!;
      const bytes = Buffer.from(JSON.stringify(record));
      if (
        bytes.length > 262144 ||
        totalBytes + bytes.length > MAX_JOURNAL_BYTES ||
        taskContainsPrivateMaterial(record)
      )
        return taskFailure(
          "TASK_BENCHMARK_INVALID",
          "Benchmark record exceeds its safe metadata boundary.",
        );
      await guardBase();
      if (folder === undefined) {
        // Exclusive allocation also prevents another process from replaying the same campaign.
        await mkdir(folderPath, { mode: 0o700 });
        await syncTaskDirectory(base.path);
        folder = await capturePrivateTaskStateDirectory(folderPath);
      } else {
        const current = await inspect();
        if (
          !current.success ||
          taskContentHash(current.data.events) !== taskContentHash(acknowledged)
        )
          return taskFailure(
            "TASK_STATE_CONFLICT",
            "Retained benchmark records changed; no new event was written.",
          );
      }
      await writePrivateTaskStateFile(
        folder,
        `${String(record.sequence).padStart(3, "0")}.json`,
        bytes,
      );
      await guardBase();
      acknowledged.push(record);
      totalBytes += bytes.length;
      return { success: true, data: true };
    } catch {
      // Preserve partial/existing records. No deletion, overwrite, retry or automatic lock recovery.
      return taskFailure(
        "TASK_STATE_WRITE_FAILED",
        "Benchmark retention stopped; inspect private records before any further dispatch.",
      );
    } finally {
      busy = false;
    }
  };
  return {
    success: true as const,
    data: { campaignId, folderPath, retain, inspect, now: () => performance.now() },
  };
}
