import { DEFAULT_BASE_PATH, withBasePath } from "./base-path";

const internalAssetBaseUrl = "https://internal-endatix.local";

export class InvalidPublicAssetPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPublicAssetPathError";
  }
}

/**
 * Resolves the public asset path relative to the internal asset base URL.
 * @param assetPath - The asset path to resolve.
 * @param basePath - The base path to resolve the asset path relative to.
 * @returns The resolved public asset path.
 */
export function getPublicAssetPath(
  assetPath: string,
  basePath: string = DEFAULT_BASE_PATH,
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
    throw new InvalidPublicAssetPathError(
      "Protocol-relative URLs are not allowed.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedAssetPath, internalAssetBaseUrl);
  } catch (err) {
    throw new InvalidPublicAssetPathError("Invalid URL format.");
  }

  if (parsedUrl.origin !== internalAssetBaseUrl) {
    throw new InvalidPublicAssetPathError(
      "Absolute URIs are not allowed for internal public assets.",
    );
  }

  if (parsedUrl.search.length > 0 || parsedUrl.hash.length > 0) {
    throw new InvalidPublicAssetPathError(
      "Public asset paths must not include query strings or hashes.",
    );
  }

  return withBasePath(parsedUrl.pathname, basePath);
}
