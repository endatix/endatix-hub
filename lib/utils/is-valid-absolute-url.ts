/**
 * True when `url` is a valid absolute http(s) URL.
 * Rejects empty values, protocol-relative `//`, and non-http(s) schemes.
 */
export function isValidAbsoluteUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl.length === 0 || trimmedUrl.startsWith("//")) {
    return false;
  }

  try {
    const urlObj = new URL(trimmedUrl);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}
