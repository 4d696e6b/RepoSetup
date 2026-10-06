import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";
import { isWellFormedTaskString, type taskLineRangeSchema } from "./primitives.js";
import type { z } from "zod";

export const TASK_CONTEXT_LIMITS = {
  maxFileBytes: 65536,
  maxContextBytes: 262144,
  maxInventoryEntries: 4096,
  maxInventoryDepth: 32,
  maxSources: 128,
  maxImportDepth: 2,
} as const;
export function taskByteHash(bytes: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
/** Keep BOM, CRLF and a final unterminated line exactly as read. */
export function decodeTaskText(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  if (
    !isWellFormedTaskString(text) ||
    [...text].some((char) => char.charCodeAt(0) < 32 && ![9, 10, 13].includes(char.charCodeAt(0)))
  )
    throw new Error("Non-text task source.");
  return text;
}
export function selectTaskLines(text: string, range?: z.infer<typeof taskLineRangeSchema>): string {
  if (range === undefined) return text;
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  if (range.start < 1 || range.end < range.start || range.end > lines.length)
    throw new Error("Source range is absent.");
  return lines.slice(range.start - 1, range.end).join("");
}
/** Conservative screening, not a guarantee that arbitrary private material can be recognized. */
export function hasTaskSecretMaterial(text: string): boolean {
  if (/-----BEGIN (?:[A-Z ]*PRIVATE KEY|OPENSSH PRIVATE KEY)-----/.test(text)) return true;
  if (
    /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b/.test(
      text,
    )
  )
    return true;
  const literalValues = [
    ...text.matchAll(
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|client[_-]?secret)["']?\s*[=:]\s*(["'])([^\r\n]*?)\1/gi,
    ),
  ].map((match) => match[2]!);
  const environmentValues = [
    ...text.matchAll(
      /^\s*(?:export\s+)?(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|PASSWORD|CLIENT_SECRET)\s*=\s*([^\s#]*)/gim,
    ),
  ].map((match) => match[1]!.replace(/^["']|["']$/g, ""));
  for (const value of [...literalValues, ...environmentValues]) {
    if (value === "") continue;
    if (
      !/^(?:undefined|null|false|true|example|placeholder|changeme|your[_-].*|replace[_-].*|<.*>|\$.*|process\..*|import\..*)$/i.test(
        value,
      )
    )
      return true;
  }
  return /https?:\/\/[^\s/:]+:[^\s/@]+@/.test(text) || /\bBearer\s+[A-Za-z0-9_.-]{20,}/.test(text);
}
