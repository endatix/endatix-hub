const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const internalAssetBaseUrl = "http://internal-endatix.local";

/**
 * Normalizes the base path to a string that can be used to resolve the public asset path.
 * @param basePath - The base path to normalize.
 * @returns The normalized base path.
 */
function normalizeBasePath(basePath: string): string {
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

/**
 * Resolves the public asset path relative to the internal asset base URL.
 * @param assetPath - The asset path to resolve.
 * @param basePath - The base path to resolve the asset path relative to.
 * @returns The resolved public asset path.
 */
export function getPublicAssetPath(
  assetPath: string,
  basePath: string = configuredBasePath,
): string {
  if (typeof assetPath !== "string") {
    return "";
  }

  const trimmedAssetPath = assetPath.trim();
  if (trimmedAssetPath.length === 0) {
    return "";
  }

  if (
    trimmedAssetPath.startsWith("//") ||
    trimmedAssetPath.startsWith("\\\\")
  ) {
    throw new Error("Protocol-relative URLs are not allowed.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedAssetPath, internalAssetBaseUrl);
  } catch (err) {
    throw new Error("Invalid URL format.");
  }

  if (parsedUrl.origin !== internalAssetBaseUrl) {
    throw new Error(
      "Absolute URIs are not allowed for internal public assets.",
    );
  }

  if (parsedUrl.search.length > 0 || parsedUrl.hash.length > 0) {
    throw new Error(
      "Public asset paths must not include query strings or hashes.",
    );
  }

  const normalizedAssetPath = parsedUrl.pathname;
  const normalizedBasePath = normalizeBasePath(basePath);

  if (
    normalizedBasePath.length === 0 ||
    normalizedAssetPath === normalizedBasePath ||
    normalizedAssetPath.startsWith(`${normalizedBasePath}/`)
  ) {
    return normalizedAssetPath;
  }

  return `${normalizedBasePath}${normalizedAssetPath}`;
}
