export type VersionTuple = readonly [number, number, number];

const RANGE_SYNTAX = /^(?:(?:\^|>=)\d+(?:\.\d+){0,2})(?:\s*\|\|\s*(?:\^|>=)\d+(?:\.\d+){0,2})*$/;

export function isSupportedVersionRange(range: string): boolean {
  return RANGE_SYNTAX.test(range.trim());
}

export function versionSatisfiesRange(actual: VersionTuple, range: string): boolean {
  if (!isSupportedVersionRange(range)) {
    return false;
  }

  return range.split("||").some((part) => satisfiesComparator(actual, part.trim()));
}

function satisfiesComparator(actual: VersionTuple, comparator: string): boolean {
  if (comparator.startsWith(">=")) {
    return !isBelow(actual, parseVersion(comparator.slice(2)));
  }

  if (comparator.startsWith("^")) {
    const minimum = parseVersion(comparator.slice(1));
    const nextMajor: VersionTuple = [minimum[0] + 1, 0, 0];
    return !isBelow(actual, minimum) && isBelow(actual, nextMajor);
  }

  return false;
}

function parseVersion(value: string): VersionTuple {
  const [major = "0", minor = "0", patch = "0"] = value.split(".");
  return [Number(major), Number(minor), Number(patch)];
}

function isBelow(actual: VersionTuple, minimum: VersionTuple): boolean {
  for (const index of [0, 1, 2] as const) {
    if (actual[index] !== minimum[index]) {
      return actual[index] < minimum[index];
    }
  }
  return false;
}
