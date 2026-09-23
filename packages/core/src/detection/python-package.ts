export function pythonDistributionName(spec: string): string {
  const extras = spec.indexOf("[");
  const withoutExtras = extras === -1 ? spec : spec.slice(0, extras);
  const versionMarker = withoutExtras.search(/[<>=!~]/);
  const name = versionMarker === -1 ? withoutExtras : withoutExtras.slice(0, versionMarker);
  return name.toLowerCase();
}

export function textDeclaresPythonPackage(text: string, spec: string): boolean {
  const name = pythonDistributionName(spec);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = new RegExp(`["']${escaped}(?:\\[[^\\]]*\\])?(?:[<>=!~][^"'\\s]*)?["']`, "i");
  if (quoted.test(text)) {
    return true;
  }

  const line = new RegExp(`^${escaped}(?:\\[[^\\]]*\\])?(?:[<>=!~]\\S*)?\\s*(?:#.*)?$`, "im");
  return line.test(text);
}
