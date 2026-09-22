export type ProjectRelativePath = string;

export function isSafeProjectRelativePath(value: string): boolean {
  if (value.length === 0 || value.includes("\0")) {
    return false;
  }

  if (value.trim() !== value) {
    return false;
  }

  if (value.startsWith("/") || value.startsWith("\\")) {
    return false;
  }

  if (/^[a-zA-Z]:[\\/]/.test(value)) {
    return false;
  }

  const normalized = value.replaceAll("\\", "/");

  if (normalized.startsWith("//")) {
    return false;
  }

  const segments = normalized.split("/");

  for (const segment of segments) {
    if (segment === "" || segment === "..") {
      return false;
    }
  }

  return true;
}

export function isSafeProjectName(value: string): boolean {
  if (value.length === 0 || value.trim() !== value) {
    return false;
  }

  if (value === "." || value === "..") {
    return false;
  }

  if (value.includes("\0") || value.includes("/") || value.includes("\\")) {
    return false;
  }

  return true;
}
