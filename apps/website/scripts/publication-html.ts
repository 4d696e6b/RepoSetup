import { handoff } from "../src/handoff.ts";
import { publicationPresentation, type Publication } from "../src/publication.ts";

/** Build-only presentation; registry verification happens before this function. */
export function publicationHtml(html: string, publication: Publication | null): string {
  const markers = [
    "0.3.0 development",
    "blob/v0.2.3/docs/humanOnly/RepoSetup_0.2.3.md",
    "0.2.3 user guide",
  ];
  for (const marker of markers) {
    if (!html.includes(marker)) throw new Error(`Missing release HTML marker: ${marker}`);
  }
  const { publishedVersion } = publicationPresentation(publication);
  return html
    .replace(markers[0]!, publication ? handoff.version : `${handoff.version} candidate`)
    .replace(markers[1]!, `blob/v${publishedVersion}/README.md`)
    .replace(markers[2]!, `${publishedVersion} user guide`);
}
