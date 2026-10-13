import { handoff } from "./handoff.js";

export interface Publication {
  version: string;
  sourceSha: string;
  sha256: string;
  publishedAt: string;
}

declare const __REPOSETUP_PUBLICATION__: Publication | null;

/** Injected only after the build verifies actual registry bytes against the committed handoff. */
export const publication =
  typeof __REPOSETUP_PUBLICATION__ === "undefined" ? null : __REPOSETUP_PUBLICATION__;

export function publicationPresentation(record: Publication | null) {
  const published = record !== null;
  const version = handoff.version;
  const publishedVersion = published ? version : "0.2.3";
  return {
    published,
    publishedVersion,
    install: `npm install -g rsetup@${publishedVersion}`,
    packageUrl: `https://www.npmjs.com/package/rsetup/v/${publishedVersion}`,
    title: `RepoSetup ${version}${published ? "" : " candidate"}`,
    announcement: `${version}${published ? "" : " candidate"} · review the changes  ↗`,
    notice: published
      ? `RepoSetup ${version}. These references and selections use the published ${version} CLI. Review and confirm the plan in your terminal.`
      : "0.3.0 release candidate. These references and selections require the reviewed 0.3.0 CLI; the currently published package remains 0.2.3.",
    builder: published
      ? `RepoSetup CLI ${version}. Install the matching published version before using these commands. Your local CLI validates the choices and asks for confirmation.`
      : `${handoff.label}. These commands require the packed CLI from that exact commit on your PATH. The published 0.2.3 CLI does not accept selection-v1. Prepare the matching local CLI before using these commands.`,
    reference: published
      ? `Published RepoSetup ${version} · reviewed CLI reference`
      : "Reviewed 0.3.0 release candidate · publication pending",
    introduction: published
      ? `This site documents the published RepoSetup ${version} CLI. Install the matching version before following these examples.`
      : "This site documents the reviewed 0.3.0 release candidate. The published package remains 0.2.3; use the matching local CLI before following these new examples.",
    releaseSummary: published
      ? `RepoSetup ${version} is published. Install the matching version for these workflows. Publication history retains the earlier releases separately.`
      : "The currently published package remains 0.2.3. Use the matching reviewed 0.3.0 CLI for these new workflows. Publication history records actual releases separately from candidate work.",
    staleCli: published
      ? `If the CLI reports SELECTION_INVALID with a catalog or version reason, install rsetup@${version} and regenerate the selection. Do not edit encoded tokens to bypass validation. Local detection may also reject an incompatible project.`
      : "If the CLI reports SELECTION_INVALID with a catalog or version reason, use this preview’s exact local CLI artifact and regenerate the selection. Do not edit encoded tokens to bypass validation. Local detection may also reject an incompatible project.",
  };
}

export const delivery = publicationPresentation(publication);
