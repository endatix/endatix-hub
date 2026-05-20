const UTF8_HEADER_PREFIX = "utf8:";

/** Checks if a string is a Latin-1 header value. */
function isLatin1HeaderValue(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 255) {
      return false;
    }
  }
  return true;
}

/**
 * Ensures a string is safe as a `fetch()` / `Headers` value (ByteString / ISO-8859-1).
 * Non-Latin-1 Unicode is wrapped with `utf8:` + {@link encodeURIComponent} (ASCII only).
 * Used for Azure x-ms-meta-* (and similar) so browser PUT uploads do not throw.
 */
export function encodeHeaderValueForFetch(value: string): string {
  if (isLatin1HeaderValue(value)) {
    return value;
  }
  return `${UTF8_HEADER_PREFIX}${encodeURIComponent(value)}`;
}

/** Reverses {@link encodeHeaderValueForFetch} when reading blob metadata back. */
export function decodeHeaderValueFromFetch(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value.startsWith(UTF8_HEADER_PREFIX)) {
    try {
      return decodeURIComponent(value.slice(UTF8_HEADER_PREFIX.length));
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Keeps only header values that browser `fetch()` can pass to `Headers`.
 * Provider builders should encode metadata first; this is the final fetch-boundary guard.
 */
export function sanitizeFetchHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (isLatin1HeaderValue(value)) {
      sanitized[name] = value;
    }
  }
  return sanitized;
}
