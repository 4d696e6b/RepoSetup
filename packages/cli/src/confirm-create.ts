import { confirm } from "@inquirer/prompts";

export async function confirmCreate(message = "Proceed with installation?"): Promise<boolean> {
  if (process.stdin.isTTY !== true) {
    return false;
  }

  return confirm({
    message,
    default: true,
  });
}
