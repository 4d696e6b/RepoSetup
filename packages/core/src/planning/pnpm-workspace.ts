/** A pnpm workspace root declares package globs. Build approvals alone do not. */
export function declaresPnpmWorkspacePackages(content: string): boolean {
  return /^packages\s*:/m.test(content);
}
