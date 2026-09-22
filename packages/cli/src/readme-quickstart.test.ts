import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const readme = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../README.md"),
  "utf8",
);

describe("README quickstart", () => {
  it("documents a dry-run create from the Next.js example", () => {
    expect(readme).toContain("pnpm install");
    expect(readme).toContain("pnpm build");
    expect(readme).toContain("examples/reposetup.next-sqlite.json");
    expect(readme).toContain("--dry-run");
    expect(readme).toContain("reposetup create");
    expect(readme).toContain("alpha prerelease");
    expect(readme).toContain("npx @reposetup/cli");
  });
});
