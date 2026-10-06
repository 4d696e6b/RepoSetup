import { lstat } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { taskFailure, type TaskParseResult } from "@reposetup/core";
import { TASK_CHECK_OUTPUT_BYTES } from "./check-recipes.js";
import { captureVerifierRoot, readVerifierFile, verifyVerifierRoot } from "./verifier-read.js";

/** Call before launch with a new executor-owned 0700 directory. No writes or cleanup occur here. */
export async function prepareTaskReportReader(
  directory: string,
): Promise<TaskParseResult<{ read(): Promise<TaskParseResult<string>> }>> {
  try {
    const root = await captureVerifierRoot(directory);
    const info = await lstat(directory);
    if (process.getuid === undefined || info.uid !== process.getuid() || (info.mode & 0o077) !== 0)
      throw new Error("private directory");
    const report = path.join(directory, "unit-report.json");
    try {
      await lstat(report);
      return taskFailure("TASK_OUTPUT_INCOMPLETE", "Verifier report must be absent before launch.");
    } catch (error) {
      if (!(
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
    let consumed = false;
    return {
      success: true,
      data: {
        async read() {
          if (consumed)
            return taskFailure(
              "TASK_OUTPUT_INCOMPLETE",
              "Verifier report reader has already been consumed.",
            );
          consumed = true;
          try {
            await verifyVerifierRoot(root);
            const current = await lstat(directory);
            if (current.uid !== process.getuid!() || (current.mode & 0o077) !== 0)
              throw new Error("privacy drift");
            const reportInfo = await lstat(report);
            if (reportInfo.uid !== current.uid) throw new Error("owner");
            const read = await readVerifierFile(
              root,
              "unit-report.json",
              TASK_CHECK_OUTPUT_BYTES,
              true,
            );
            const finalDirectory = await lstat(directory);
            if (finalDirectory.uid !== current.uid || (finalDirectory.mode & 0o077) !== 0)
              throw new Error("privacy drift");
            return {
              success: true,
              data: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(read.bytes),
            };
          } catch {
            return taskFailure(
              "TASK_OUTPUT_INCOMPLETE",
              "Fresh private verifier report is absent, unsafe, changing or incomplete.",
            );
          }
        },
      },
    };
  } catch {
    return taskFailure(
      "TASK_OUTPUT_INCOMPLETE",
      "Verifier report requires a new private canonical directory.",
    );
  }
}
