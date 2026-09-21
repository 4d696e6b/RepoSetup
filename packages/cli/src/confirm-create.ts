import { confirm } from "@inquirer/prompts";

export async function confirmCreate(): Promise<boolean> {
  if (process.stdin.isTTY !== true) {
    return false;
  }

  return confirm({
    message: "Proceed with installation?",
    default: true,
  });
}
