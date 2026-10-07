#!/usr/bin/env node

import { runCli } from "./run-cli.js";

const abortController = new AbortController();
const onInterrupt = () => abortController.abort();
process.once("SIGINT", onInterrupt);

try {
  const result = await runCli(process.argv.slice(2), { signal: abortController.signal });
  process.exitCode = result.exitCode;
} finally {
  process.off("SIGINT", onInterrupt);
}
