import type { DetectedItem, DetectedStack } from "@reposetup/core";

const CATEGORY_ORDER = [
  "runtime",
  "package-manager",
  "framework",
  "backend-framework",
  "styling",
  "ui",
  "database",
  "orm",
  "validation",
  "testing",
  "formatting",
  "linting",
  "migration",
  "infrastructure",
  "ci",
  "utility",
] as const;

const LABELS: Record<string, string> = {
  runtime: "Runtime",
  "package-manager": "Package mgr",
  framework: "Framework",
  "backend-framework": "Framework",
  styling: "Styling",
  ui: "UI",
  database: "Database",
  orm: "ORM",
  validation: "Validation",
  testing: "Testing",
  formatting: "Formatting",
  linting: "Linting",
  migration: "Migration",
  infrastructure: "Infrastructure",
  ci: "CI",
  utility: "Utility",
};

export function renderStack(stack: DetectedStack, verbose: boolean): string {
  const lines: string[] = [];
  const rows = collectRows(stack);

  if (rows.length === 0) {
    lines.push("No supported runtime, package manager, or integrations were detected.");
  } else {
    const width = Math.max(...rows.map((row) => row.label.length), "Package mgr".length);
    for (const row of rows) {
      lines.push(`${row.label.padEnd(width)}  ${row.value}`);
    }
  }

  for (const warning of stack.warnings) {
    lines.push("", warning);
  }

  if (verbose) {
    lines.push("", `Project root  ${stack.projectRoot}`);
    for (const item of allItems(stack)) {
      lines.push("", `${item.name} evidence:`);
      for (const entry of item.evidence) {
        const path = entry.path === undefined ? "" : ` (${entry.path})`;
        lines.push(`  - ${entry.detail}${path}`);
      }
    }
    if (stack.language !== undefined) {
      lines.push("", `Language evidence:`);
      for (const entry of stack.language.evidence) {
        const path = entry.path === undefined ? "" : ` (${entry.path})`;
        lines.push(`  - ${entry.detail}${path}`);
      }
    }
  }

  return lines.join("\n");
}

function collectRows(stack: DetectedStack): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const grouped = new Map<string, DetectedItem[]>();

  for (const item of allItems(stack)) {
    const label = LABELS[item.category] ?? item.category;
    const existing = grouped.get(label) ?? [];
    existing.push(item);
    grouped.set(label, existing);
  }

  const seen = new Set<string>();
  for (const category of CATEGORY_ORDER) {
    const label = LABELS[category] ?? category;
    if (seen.has(label)) {
      continue;
    }
    seen.add(label);
    const items = grouped.get(label);
    if (items === undefined || items.length === 0) {
      continue;
    }
    rows.push({ label, value: items.map(formatItem).join("; ") });
    if (label === "Framework" && stack.language !== undefined) {
      rows.push({
        label: "Language",
        value: formatNamed(
          stack.language.id === "typescript" ? "TypeScript" : "JavaScript",
          stack.language.confidence,
        ),
      });
    }
  }

  if (stack.language !== undefined && !rows.some((row) => row.label === "Language")) {
    rows.push({
      label: "Language",
      value: formatNamed(
        stack.language.id === "typescript" ? "TypeScript" : "JavaScript",
        stack.language.confidence,
      ),
    });
  }

  return rows;
}

function allItems(stack: DetectedStack): DetectedItem[] {
  return [...stack.runtimes, ...stack.packageManagers, ...stack.frameworks, ...stack.integrations];
}

function formatItem(item: DetectedItem): string {
  return formatNamed(item.name, item.confidence);
}

function formatNamed(name: string, confidence: DetectedItem["confidence"]): string {
  return confidence === "certain" ? name : `${name} (${confidence})`;
}
