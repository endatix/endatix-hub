export const DEFAULT_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function normalizeBasePath(
  basePath: string = DEFAULT_BASE_PATH,
): string {
  if (typeof basePath !== "string") {
    return "";
  }

  const trimmed = basePath.trim();
  if (trimmed.length === 0 || trimmed === "/") {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export function withBasePath(
  path: string,
  basePath: string = DEFAULT_BASE_PATH,
): string {
  if (typeof path !== "string") {
    return "";
  }

  const trimmed = path.trim();
  if (trimmed.length === 0) {
    return "";
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalizedBasePath = normalizeBasePath(basePath);

  if (
    normalizedBasePath.length === 0 ||
    normalizedPath === normalizedBasePath ||
    normalizedPath.startsWith(`${normalizedBasePath}/`) ||
    normalizedPath.startsWith(`${normalizedBasePath}?`) ||
    normalizedPath.startsWith(`${normalizedBasePath}#`)
  ) {
    return normalizedPath;
  }

  return `${normalizedBasePath}${normalizedPath}`;
}
