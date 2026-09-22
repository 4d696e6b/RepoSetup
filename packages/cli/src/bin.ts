#!/usr/bin/env node

import { runCli } from "./run-cli.js";

const result = await runCli(process.argv.slice(2));
process.exitCode = result.exitCode;
