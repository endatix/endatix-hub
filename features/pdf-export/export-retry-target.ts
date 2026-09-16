import { withBasePath } from "@/lib/hosting/base-path";

/**
 * The retry affordance on the export error page.
 *
 * Retrying needs the access token, and the token is exactly what must never
 * travel in a URL - putting it in the error page's address would undo the
 * stripping the redirect does, pushing it back into history, access logs,
 * `Referer` and any screenshot. So the original link is carried in an
 * `HttpOnly` cookie instead, read only on the server, and never rendered.
 *
 * The cookie is not signed, because it does not need to be: whatever it
 * contains is clamped by {@link parseExportRetryTarget} to a same-origin
 * `/export-pdf/{id}` path carrying a token. A forged cookie can therefore do
 * nothing worse than point at another export link - it can never produce an
 * off-site redirect or a `javascript:` URI.
 */
export const EXPORT_RETRY_COOKIE = "endatix_export_retry";

/** Long enough to read the page and click, short enough to limit token storage. */
export const EXPORT_RETRY_COOKIE_MAX_AGE_SECONDS = 600;

/** Only ever sent to the error page and its retry handler. */
export const EXPORT_RETRY_COOKIE_PATH = "/export-error";

/** A stored value longer than this is not something we wrote. */
const MAX_TARGET_LENGTH = 2048;

/** Parsing base. Any value that escapes it is not a relative path. */
const PLACEHOLDER_ORIGIN = "https://export-retry.invalid";

/**
 * Validates a stored retry target, returning a safe relative URL or `null`.
 *
 * Rejects anything that is not a same-origin export path with a token: absolute
 * URLs, protocol-relative `//evil.com`, `javascript:`, traversal, and paths that
 * simply are not exports.
 */
export function parseExportRetryTarget(
  value: string | undefined | null,
): string | null {
  if (!value || value.length > MAX_TARGET_LENGTH) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }

  // An absolute or protocol-relative value would resolve to another origin.
  if (url.origin !== PLACEHOLDER_ORIGIN) {
    return null;
  }

  const expectedPrefix = withBasePath("/export-pdf");
  const idPattern = new RegExp(`^${expectedPrefix}/[0-9]+$`);
  if (!idPattern.test(url.pathname)) {
    return null;
  }

  // Without a token the retry cannot succeed, so this is not our value.
  if (!url.searchParams.get("token")) {
    return null;
  }

  return `${url.pathname}${url.search}`;
}
