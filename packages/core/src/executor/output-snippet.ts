const SECRET_NAME =
  /\b([A-Za-z_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|CREDENTIAL)|DATABASE_URL)/.source;
const SECRET_ASSIGNMENT = new RegExp(`${SECRET_NAME}\\s*[:=]\\s*\\S+`, "gi");
const COMPLETE_SECRET_NAME = new RegExp(`^${SECRET_NAME}$`, "i");

/** Keep a recognized key/separator with its future value, including newline whitespace. */
export function hasIncompleteSecretAssignment(output: string): boolean {
  // Only the suffix can be incomplete. Search backwards to avoid rescanning all
  // earlier keys for every output record in a retained multiline assignment.
  let end = output.length;
  while (end > 0 && /\s/.test(output.charAt(end - 1))) end--;
  if (end > 0 && /[:=]/.test(output.charAt(end - 1))) {
    end--;
    while (end > 0 && /\s/.test(output.charAt(end - 1))) end--;
  }
  let start = end;
  while (start > 0 && /[A-Za-z_]/.test(output.charAt(start - 1))) start--;
  if (start > 0 && /\w/.test(output.charAt(start - 1))) return false;
  return COMPLETE_SECRET_NAME.test(output.slice(start, end));
}

const MAX_SNIPPET_CHARS = 2000;
const MAX_SNIPPET_LINES = 24;

export function summarizeFailedProcessOutput(stdout: string, stderr: string): string | undefined {
  const combined = [stderr.trim(), stdout.trim()].filter((part) => part.length > 0).join("\n");
  if (combined.length === 0) {
    return undefined;
  }

  const redacted = redactProcessOutput(combined);
  const lines = redacted.split(/\r?\n/).slice(-MAX_SNIPPET_LINES);
  let snippet = lines.join("\n");
  if (snippet.length > MAX_SNIPPET_CHARS) {
    snippet = snippet.slice(snippet.length - MAX_SNIPPET_CHARS);
  }

  return snippet;
}

export function redactProcessOutput(output: string): string {
  return output.replace(SECRET_ASSIGNMENT, "$1=<redacted>");
}

export function commandFailureSuggestion(snippet: string | undefined): string {
  if (
    snippet !== undefined &&
    (snippet.includes("cache folder contains root-owned files") ||
      (/\b(?:EACCES|EPERM|EEXIST)\b/i.test(snippet) &&
        /(?:_cacache|npm[^\n]*cache)/i.test(snippet)))
  ) {
    return "npm could not write its cache. Use a writable npm cache for the failed command. If the generated project has package.json, run npm install --include=dev --cache <writable-cache-directory> there, then finish any remaining setup steps and run rsetup doctor. If scaffolding did not finish, review partial files before retrying the failed generator with a writable cache. Do not rerun create over existing files or use --force; RepoSetup will not run sudo for you.";
  }

  return "Inspect the command output, fix the project, and re-run the plan.";
}

/** Network failures that package managers document as transient. This is classification only; generators are never replayed. */
export function isTransientDownloadFailure(snippet: string | undefined): boolean {
  return (
    snippet !== undefined &&
    /\b(?:ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|fetch failed|network timeout)\b/i.test(
      snippet,
    )
  );
}
