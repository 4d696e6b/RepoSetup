import { open } from "node:fs/promises";
import {
  decodeTaskJson,
  summarizeTaskBenchmark,
  TASK_DOCUMENT_LIMITS,
} from "../packages/core/dist/index.js";
// Developer report tool: bounded declarative metadata only; never dispatches a trial/provider.
try {
  if (process.argv.length !== 3) throw new Error("Input required");
  const file = await open(process.argv[2]!, "r");
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
  const report = summarizeTaskBenchmark(decoded.data);
  if (!report.success) {
    process.stdout.write(JSON.stringify({ error: report.error }) + "\n");
    process.exitCode = 2;
  } else {
    process.stdout.write(JSON.stringify(report.data, null, 2) + "\n");
    if (!report.data.complete) process.exitCode = 3;
  }
} catch {
  process.stdout.write(
    JSON.stringify({
      error: {
        code: "TASK_BENCHMARK_INVALID",
        message: "Provide one bounded version 1 benchmark campaign JSON file.",
      },
    }) + "\n",
  );
  process.exitCode = 2;
}
