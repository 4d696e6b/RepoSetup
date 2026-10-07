import type { Command } from "commander";
import { handleTask, type TaskCommandOptions } from "./commands.js";
import { writeLine } from "../io.js";
import type { ResolvedCliDeps, GlobalCliOptions } from "../types.js";
import { handleManagedTask, type TaskManagedOptions } from "./managed-command.js";

export function registerTaskCommands(
  program: Command,
  deps: ResolvedCliDeps,
  globals: (command: Command) => GlobalCliOptions,
  setExitCode: (code: number) => void,
): void {
  const task = program
    .command("task")
    .description("Compile and inspect experimental portable coding tasks");
  task.action(() => {
    writeLine(deps.io.writeErr, "Missing task command. See task --help.");
    task.outputHelp({ error: true });
    setExitCode(2);
  });
  const common = (command: Command) =>
    command
      .requiredOption("--review <path>", "independent version 1 task_review JSON")
      .option("--root <path>", "reviewed project root (default current directory)")
      .option("--preferences <path>", "separate task_preferences JSON (default local handoff)")
      .option(
        "--dry-run",
        "read and preview without writes, calls, subprocesses or attempts",
        false,
      )
      .option("--json", "write output-version 1 task JSON")
      .option("--quiet", "reduce output")
      .option("--verbose", "include extra detail");
  common(
    task
      .command("compile")
      .description("Validate an independently reviewed Markdown phase and structured draft"),
  )
    .option(
      "--draft <path>",
      "version 1 task_plan_draft JSON; omitted input returns a decomposition request",
    )
    .option("--heading <text>", "exact unique ATX heading matching the reviewed range")
    .option("--lines <start:end>", "inclusive range matching the reviewed phase")
    .option("--managed", "request one structured draft under explicit provider allowance", false)
    .option("--state-root <path>", "preexisting private compilation ledger directory")
    .option("--effort <id>", "explicit native effort for fixed gpt-6.1-sol decomposition")
    .option("--max-output-tokens <count>", "managed output ceiling (default 4096)")
    .option("--timeout-ms <count>", "managed deadline (default 120000)")
    .option("--allow-provider-usage", "explicitly allow a potentially billable draft call", false)
    .option("--approve-compilation <hash>", "exact managed compilation dry-run summaryId")
    .action(async (options: TaskCommandOptions, command: Command) => {
      setExitCode(await handleTask("compile", options, deps, globals(command)));
    });
  common(
    task
      .command("next")
      .description("Prepare an advisory packet for one independent task; no execution"),
  )
    .requiredOption("--plan <path>", "frozen task plan or task_compilation receipt")
    .option("--task <id>", "independent task ID (default first in stable DAG order)")
    .option("--run-id <uuid>", "caller-supplied advisory dispatch UUID; no durable run is opened")
    .option("--attempt <1-3>", "caller-supplied advisory attempt identity; no counter is advanced")
    .action(async (options: TaskCommandOptions, command: Command) => {
      setExitCode(await handleTask("next", options, deps, globals(command)));
    });
  common(
    task
      .command("status")
      .description("Inspect a task plan and optionally report an unverified run snapshot"),
  )
    .requiredOption("--plan <path>", "frozen task plan or task_compilation receipt")
    .option("--state <path>", "explicit phase_run snapshot; reported evidence remains unverified")
    .action(async (options: TaskCommandOptions, command: Command) => {
      setExitCode(await handleTask("status", options, deps, globals(command)));
    });
  common(
    task
      .command("run")
      .description("Execute an explicitly reviewed experimental managed coding phase"),
  )
    .requiredOption("--plan <path>", "frozen task plan or compilation receipt")
    .requiredOption(
      "--authority <path>",
      "separate independently reviewed fixed-check host authority",
    )
    .requiredOption(
      "--state-root <path>",
      "preexisting private 0700 state directory outside the project",
    )
    .requiredOption(
      "--scratch-root <path>",
      "reviewed preexisting verifier scratch parent outside the project",
    )
    .requiredOption("--effort <id>", "native effort for the fixed gpt-6.1-sol transport")
    .option("--max-output-tokens <count>", "per-call output ceiling including reasoning", "4096")
    .option("--timeout-ms <count>", "per-call deadline within the phase allowance", "120000")
    .option("--allow-provider-usage", "explicitly allow potentially billable provider calls", false)
    .option("--approve-run <hash>", "exact summaryId reviewed from task run --dry-run --json")
    .action(async (options: TaskManagedOptions, command: Command) => {
      setExitCode(await handleManagedTask(options, deps, globals(command)));
    });
}
