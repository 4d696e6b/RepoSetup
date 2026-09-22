import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const readme = readFileSync(join(here, "../../../README.md"), "utf8");
const { version } = JSON.parse(readFileSync(join(here, "../package.json"), "utf8")) as {
  version: string;
};

describe("README quickstart", () => {
  it("documents a dry-run create from the Next.js example", () => {
    expect(readme).toContain("pnpm install");
    expect(readme).toContain("pnpm build");
    expect(readme).toContain("examples/reposetup.next-sqlite.json");
    expect(readme).toContain("--dry-run");
    expect(readme).toContain("reposetup create");
    expect(readme).toContain("early-stage");
    expect(readme).toContain(version);
    expect(readme).toContain("npx rsetup");
  });
});
