import { Command, CommanderError } from "commander";

import { confirmCreate as defaultConfirmCreate } from "./confirm-create.js";
import { handleCreate } from "./create.js";
import { createDefaultRegistry } from "./default-registry.js";
import { EXIT_CODES } from "./exit-codes.js";
import { handleInfo } from "./info.js";
import { createDefaultFs, createDefaultIo, writeLine } from "./io.js";
import { promptCreate } from "./prompt-create.js";
import { handleRegistryValidate } from "./registry-validate.js";
import { handleSearch } from "./search.js";
import { handleStack } from "./stack.js";
import type {
  CliDeps,
  CliResult,
  CreateCommandOptions,
  GlobalCliOptions,
  ResolvedCliDeps,
} from "./types.js";

export async function runCli(argv: string[], deps: CliDeps = {}): Promise<CliResult> {
  const resolved = resolveDeps(deps);
  let exitCode: number = EXIT_CODES.SUCCESS;

  const program = new Command();
  program
    .name("reposetup")
    .description("Compose and inspect a project stack from a local integration registry.")
    .version("0.0.0")
    .option("--verbose", "include extra detail in output", false)
    .option("--quiet", "reduce output", false)
    .option("--no-color", "disable ANSI color (output is already plain)")
    .enablePositionalOptions()
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (text) => {
        resolved.io.writeOut(text);
      },
      writeErr: (text) => {
        resolved.io.writeErr(text);
      },
    });

  program.action(() => {
    writeLine(resolved.io.writeErr, "Missing command. See --help.");
    program.outputHelp({ error: true });
    exitCode = EXIT_CODES.INVALID_INPUT;
  });

  program
    .command("create")
    .description("Create a project from prompts or a declarative config")
    .argument("[name]", "project name")
    .option("-c, --config <path>", "path to a RepoSetup JSON config")
    .option("--dry-run", "print the installation plan without changing files", false)
    .option("--yes", "skip confirmation and execute the plan", false)
    .option("--framework <id>", "framework integration id")
    .option("--package-manager <id>", "package manager")
    .option("--typescript", "set framework option typescript=true", false)
    .option("--verbose", "include extra detail in output", false)
    .option("--quiet", "reduce output", false)
    .action(async (name: string | undefined, options: CreateCommandOptions, command: Command) => {
      exitCode = await handleCreate({
        name,
        options: {
          dryRun: options.dryRun,
          yes: options.yes,
          typescript: options.typescript,
          ...(options.config === undefined ? {} : { config: options.config }),
          ...(options.framework === undefined ? {} : { framework: options.framework }),
          ...(options.packageManager === undefined
            ? {}
            : { packageManager: options.packageManager }),
        },
        globals: readGlobals(command),
        deps: resolved,
      });
    });

  program
    .command("search")
    .description("Search the local registry")
    .argument("[query]", "text to match against integration id, name, category, or keywords")
    .option("--category <category>", "limit results to one category")
    .action((query: string | undefined, options: { category?: string }) => {
      exitCode = handleSearch({
        query,
        category: options.category,
        deps: resolved,
      });
    });

  program
    .command("info")
    .description("Show details for one integration")
    .argument("<id>", "integration id")
    .action((id: string) => {
      exitCode = handleInfo({ id, deps: resolved });
    });

  program
    .command("stack")
    .description("Detect and print the current project stack")
    .action(async (_options: unknown, command: Command) => {
      exitCode = await handleStack({
        globals: readGlobals(command),
        deps: resolved,
      });
    });

  const registryCommand = program.command("registry").description("Registry maintenance commands");

  registryCommand.action(() => {
    writeLine(resolved.io.writeErr, "Missing registry command. See --help.");
    registryCommand.outputHelp({ error: true });
    exitCode = EXIT_CODES.INVALID_INPUT;
  });

  registryCommand
    .command("validate")
    .description("Validate the loaded registry")
    .action(() => {
      exitCode = handleRegistryValidate(resolved);
    });

  try {
    await program.parseAsync(argv, { from: "user" });
    return { exitCode };
  } catch (error) {
    if (error instanceof CommanderError) {
      return {
        exitCode: error.exitCode === 0 ? EXIT_CODES.SUCCESS : EXIT_CODES.INVALID_INPUT,
      };
    }

    const message = error instanceof Error ? error.message : "Unexpected CLI failure.";
    writeLine(resolved.io.writeErr, message);
    return { exitCode: EXIT_CODES.GENERAL_FAILURE };
  }
}

function resolveDeps(deps: CliDeps): ResolvedCliDeps {
  const resolved: ResolvedCliDeps = {
    registry: deps.registry ?? createDefaultRegistry(),
    io: deps.io ?? createDefaultIo(),
    fs: deps.fs ?? createDefaultFs(),
    promptCreate: deps.promptCreate ?? promptCreate,
    confirmCreate: deps.confirmCreate ?? defaultConfirmCreate,
    cwd: deps.cwd ?? process.cwd(),
  };

  if (deps.runProcess !== undefined) {
    resolved.runProcess = deps.runProcess;
  }
  if (deps.commandExists !== undefined) {
    resolved.commandExists = deps.commandExists;
  }

  return resolved;
}

function readGlobals(command: Command): GlobalCliOptions {
  const opts = command.optsWithGlobals() as { verbose?: boolean; quiet?: boolean };
  return {
    verbose: opts.verbose === true,
    quiet: opts.quiet === true,
  };
}
