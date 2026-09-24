const SECRET_ASSIGNMENT =
  /\b([A-Za-z_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|CREDENTIAL)|DATABASE_URL)\s*[:=]\s*\S+/gi;

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
  if (snippet?.includes("cache folder contains root-owned files") === true) {
    return "npm cannot write its cache because some files are owned by root. Run the chown command npm printed, then retry. RepoSetup will not run sudo for you.";
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
