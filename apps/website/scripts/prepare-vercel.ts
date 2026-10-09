import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { browserCsp } from "../src/security.ts";

const websiteRoot = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = fileURLToPath(new URL("../../../.vercel/output/", import.meta.url));

export const securityHeaders = {
  "Content-Security-Policy": `${browserCsp}; frame-ancestors 'none'`,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
};

export const outputConfig = {
  version: 3,
  routes: [
    { src: "/(.*)", headers: securityHeaders, continue: true },
    {
      src: "/assets/(.*)",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      continue: true,
    },
    {
      src: "/(?:index\\.html)?",
      headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
      continue: true,
    },
    { handle: "filesystem" },
  ],
};

export function publicFiles(dist: string): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      const path = relative(dist, absolute).split("\\").join("/");
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        if (path === "brand/README.md" || path === "brand/prompts.json") continue;
        if (
          path !== "index.html" &&
          !/^assets\/index-[\w-]+\.(?:js|css)$/.test(path) &&
          !/^brand\/[\w-]+\.png$/.test(path)
        )
          throw new Error(`Unexpected public deployment file: ${path}`);
        files.push(path);
      } else throw new Error(`Deployment refuses links or special files: ${path}`);
    }
  };
  visit(dist);
  if (!files.includes("index.html") || !files.some((path) => path.endsWith(".js")))
    throw new Error("Build the website before preparing its Vercel artifact.");
  return files.sort();
}

export function prepareVercel(dist = join(websiteRoot, "dist"), output = outputRoot) {
  const files = publicFiles(dist);
  const html = readFileSync(join(dist, "index.html"), "utf8");
  if (!html.includes("RepoSetup 0.2.3") || !html.includes('http-equiv="Content-Security-Policy"'))
    throw new Error("Deployment requires the release-specific production build and CSP.");
  // Replace only generated build output; preserve the adjacent local project link.
  rmSync(output, { recursive: true, force: true });
  mkdirSync(join(output, "static"), { recursive: true });
  for (const file of files) {
    const destination = join(output, "static", file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(dist, file), destination);
  }
  writeFileSync(join(output, "config.json"), `${JSON.stringify(outputConfig, null, 2)}\n`);
  return files;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const files = prepareVercel();
  process.stdout.write(
    `Prepared ${files.length} static files for RepoSetup 0.2.3 in .vercel/output.\n`,
  );
}
