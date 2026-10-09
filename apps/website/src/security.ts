export const productionOrigins = [
  "https://reposetup.vercel.app",
  "https://reposetupcli.com",
  "https://www.reposetupcli.com",
];

// Only the same-site observability collection paths may receive browser requests.
const collectionSources = productionOrigins.flatMap((origin) => [
  `${origin}/_vercel/insights/`,
  `${origin}/_vercel/speed-insights/`,
]);
export const browserCsp = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src ${collectionSources.join(" ")}; object-src 'none'; base-uri 'none'; form-action 'none'`;
