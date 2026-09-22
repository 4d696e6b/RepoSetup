export const packageName = "reposetup-cli" as const;

export { EXIT_CODES } from "./exit-codes.js";
export { runCli } from "./run-cli.js";
export type {
  CliDeps,
  CliFs,
  CliIo,
  CliResult,
  CreateAnswers,
  PromptCreateContext,
} from "./types.js";
