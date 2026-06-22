const MAX_FOLDER_SLUG_LENGTH = 256;

/**
 * Safely normalizes a URL path segment for folder slug matching and display.
 *
 * Malformed percent-encoding falls back to the trimmed raw segment so routes
 * do not throw during header/breadcrumb resolution. Values are only used for
 * equality checks and React text rendering (not HTML injection or redirects).
 */
export function safeDecodeURIComponent(segment: string): string {
  if (typeof segment !== "string") {
    return "";
  }

  const trimmed = segment.trim();
  if (trimmed.length === 0) {
    return "";
  }

  const bounded =
    trimmed.length > MAX_FOLDER_SLUG_LENGTH
      ? trimmed.slice(0, MAX_FOLDER_SLUG_LENGTH)
      : trimmed;

  try {
    return decodeURIComponent(bounded);
  } catch {
    return bounded;
  }
}

export function normalizeFolderSlug(slug: string): string {
  return safeDecodeURIComponent(slug).toLowerCase();
}

export function folderSlugsMatch(left: string, right: string): boolean {
  return normalizeFolderSlug(left) === normalizeFolderSlug(right);
}
