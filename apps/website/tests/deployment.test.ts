import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { outputConfig, prepareVercel, publicFiles } from "../scripts/prepare-vercel.ts";

const temporary: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "reposetup-website-deployment-"));
  temporary.push(root);
  const dist = join(root, "dist");
  mkdirSync(join(dist, "assets"), { recursive: true });
  mkdirSync(join(dist, "brand"));
  writeFileSync(
    join(dist, "index.html"),
    '<meta http-equiv="Content-Security-Policy"><title>RepoSetup 0.2.3</title>',
  );
  writeFileSync(join(dist, "assets", "index-Ab12.js"), "export {};");
  writeFileSync(join(dist, "brand", "reposetup-logo.png"), "image fixture");
  return { root, dist, output: join(root, ".vercel", "output") };
}
afterEach(() =>
  temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);

describe("Vercel public artifact boundary", () => {
  it("copies only built public files, omits provenance prompts and retains a project link", () => {
    const { root, dist, output } = fixture();
    writeFileSync(join(dist, "brand", "README.md"), "local provenance");
    writeFileSync(join(dist, "brand", "prompts.json"), "{}");
    mkdirSync(join(root, ".vercel"), { recursive: true });
    writeFileSync(join(root, ".vercel", "project.json"), "local project link");
    expect(prepareVercel(dist, output)).toEqual([
      "assets/index-Ab12.js",
      "brand/reposetup-logo.png",
      "index.html",
    ]);
    expect(readdirSync(join(output, "static", "brand"))).toEqual(["reposetup-logo.png"]);
    expect(readFileSync(join(root, ".vercel", "project.json"), "utf8")).toBe("local project link");
    expect(JSON.parse(readFileSync(join(output, "config.json"), "utf8"))).toEqual(outputConfig);
  });

  it.each([".env", "source.ts", "assets/index-Ab12.js.map", "brand/credentials.json"])(
    "rejects unexpected artifact %s before replacing output",
    (file) => {
      const { dist, output } = fixture();
      mkdirSync(output, { recursive: true });
      writeFileSync(join(output, "previous"), "previous artifact");
      writeFileSync(join(dist, file), "unexpected");
      expect(() => prepareVercel(dist, output)).toThrow("Unexpected public deployment file");
      expect(readFileSync(join(output, "previous"), "utf8")).toBe("previous artifact");
    },
  );

  it("rejects symbolic links and a missing production CSP", () => {
    const { root, dist, output } = fixture();
    symlinkSync(join(root, "private"), join(dist, "brand", "outside.png"));
    expect(() => publicFiles(dist)).toThrow("refuses links");
    rmSync(join(dist, "brand", "outside.png"));
    writeFileSync(join(dist, "index.html"), "RepoSetup 0.2.3");
    expect(() => prepareVercel(dist, output)).toThrow("production build and CSP");
  });
});
