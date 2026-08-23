import { Result } from "../result";
import { isValidAbsoluteUrl } from "./is-valid-absolute-url";

/**
 * Extracts the hostname from a URL string. This prevents malformed URLs when hostName is concatenated with protocols elsewhere
 * @param urlString - The URL string to extract the hostname from.
 * @returns A Result containing the hostname from the URL string or a validation error.
 */
function extractHostname(urlString: string): Result<string> {
  if (!urlString) {
    return Result.validationError("URL string is required to extract hostname");
  }

  if (typeof urlString !== "string" || urlString.length === 0) {
    return Result.validationError(
      "URL string must be a non-empty string to extract hostname",
    );
  }

  const startsWithProtocol =
    urlString.startsWith("http://") || urlString.startsWith("https://");
  if (!startsWithProtocol) {
    urlString = `https://${urlString}`;
  }

  try {
    const url = new URL(urlString);
    return Result.success(url.hostname);
  } catch {
    return Result.validationError("Invalid URL string to extract hostname");
  }
}

const DEFAULT_RELATIVE_PATH = "/";

/**
 * Builds a safe relative URL (pathname + search) for redirect returnUrl.
 * Uses URL parsing against a base origin; if the result is not same-origin,
 * returns defaultPath. Prevents protocol-relative (//) and cross-origin open redirects.
 *
 * @param pathname - Request pathname (e.g. "/forms")
 * @param search - Request search string with or without leading "?"
 * @param baseOrigin - Origin of the app (e.g. "https://example.com")
 * @param defaultPath - Fallback path when input is invalid or not same-origin
 * @returns Safe relative path + search, or defaultPath
 */
function toSafeRelativeUrl(
  pathname: string,
  search: string,
  baseOrigin: string,
  defaultPath: string,
): string {
  const path = pathname || defaultPath;
  const pathNorm = path === DEFAULT_RELATIVE_PATH ? defaultPath : path;

  let queryParams = "";
  if (search && search.length > 0) {
    queryParams = search.startsWith("?") ? search : `?${search}`;
  }

  try {
    const url = new URL(pathNorm + queryParams, baseOrigin);
    if (url.origin !== baseOrigin) {
      return defaultPath;
    }
    const relative = url.pathname + url.search;
    if (relative.includes("//")) {
      return defaultPath;
    }
    return relative;
  } catch {
    return defaultPath;
  }
}

/**
 * Checks if a URL is a safe HTTP/HTTPS link, supporting both absolute and relative paths, so it supports relative redirects in embedded forms, where the host is not the same as the iframe.
 * @param url - The URL to check (e.g., "https://example.com" or "/success").
 * @returns True if the URL is safe, false if malformed or using an unsafe protocol.
 */
function isSafeRedirectUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  const trimmedUrl = url.trim();
  if (trimmedUrl.length === 0 || trimmedUrl.startsWith("//")) return false;

  if (!globalThis.window) return false;

  // Relative path redirect (e.g., "/success" or "/thank-you?lang=en")
  if (trimmedUrl.startsWith("/")) {
    try {
      const urlObj = new URL(trimmedUrl, globalThis.window.location.origin);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  return isValidAbsoluteUrl(trimmedUrl);
}

/**
 * Trims trailing slashes from a string.
 * @param value - The string to trim trailing slashes from.
 * @returns The string with trailing slashes trimmed.
 */
function trimTrailingSlashes(value: string): string {
  let end = value.length - 1;

  while (end >= 0 && value[end] === "/") {
    end -= 1;
  }

  return value.slice(0, end + 1);
}

export {
  extractHostname,
  toSafeRelativeUrl,
  isSafeRedirectUrl,
  isValidAbsoluteUrl,
  trimTrailingSlashes,
};
