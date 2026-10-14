import { constants } from "node:fs";
import { open } from "node:fs/promises";
import {
  decodeTaskJson,
  summarizeTaskBenchmark,
  TASK_DOCUMENT_LIMITS,
} from "../packages/core/dist/index.js";
import { summarizeTaskBenchmarkJournal } from "../packages/core/dist/index.js";
import { createTaskBenchmarkStore } from "../packages/cli/dist/tasks/benchmark-store.js";
// Developer report tool: bounded declarative metadata only; never dispatches a trial/provider.
try {
  const journal = process.argv.length === 5 && process.argv[2] === "--journal";
  if (!journal && process.argv.length !== 3) throw new Error("Input required");
  const file = await open(
    process.argv[journal ? 3 : 2]!,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  let bytes: Buffer;
  try {
    if (!(await file.stat()).isFile()) throw new Error("Regular input required");
    const buffer = Buffer.alloc(TASK_DOCUMENT_LIMITS.bytes + 1);
    let count = 0;
    while (count < buffer.length) {
      const read = await file.read(buffer, count, buffer.length - count, null);
      if (!read.bytesRead) break;
      count += read.bytesRead;
    }
    if (count > TASK_DOCUMENT_LIMITS.bytes) throw new Error("Input too large");
    bytes = buffer.subarray(0, count);
  } finally {
    await file.close();
  }
  const decoded = decodeTaskJson(bytes);
  if (!decoded.success) throw new Error("Invalid input");
  const report = journal
    ? await (async () => {
        const store = await createTaskBenchmarkStore({
          campaign: decoded.data,
          stateRoot: process.argv[4]!,
        });
        if (!store.success) return store;
        const inspected = await store.data.inspect();
        return inspected.success
          ? summarizeTaskBenchmarkJournal({ campaign: decoded.data, events: inspected.data.events })
          : inspected;
      })()
    : summarizeTaskBenchmark(decoded.data);
  if (!report.success) {
    process.stdout.write(JSON.stringify({ error: report.error }) + "\n");
    process.exitCode = 2;
  } else {
    process.stdout.write(JSON.stringify(report.data, null, 2) + "\n");
    if (
      "dispatchAccountingComplete" in report.data
        ? !report.data.dispatchAccountingComplete
        : !report.data.complete
    )
      process.exitCode = 3;
  }
} catch {
  process.stdout.write(
    JSON.stringify({
      error: {
        code: "TASK_BENCHMARK_INVALID",
        message:
          "Provide a bounded campaign JSON file, or --journal <fresh offline campaign> <private state root>.",
      },
    }) + "\n",
  );
  process.exitCode = 2;
}
