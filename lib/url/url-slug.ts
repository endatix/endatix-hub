/**
 * Client-side mirror of `Endatix.Core.Common.UrlSlugNormalizer` (OSS).
 * Keep behavior aligned when changing folder slug rules or reserved names.
 */

export const MAX_URL_SLUG_LENGTH = 128;
const EMPTY_STRING = "";
const HYPHEN_CHAR = "-";

/**
 * Mirrors `UrlSlugNormalizer.ReservedSlugs` (OSS Endatix.Core), plus `null` so the
 * literal string cannot reach a route param. A Hub-only entry rejects a slug the API
 * accepts and blocks re-saving folders that already carry it, so reserve new names in
 * OSS first, then mirror them here.
 */
const RESERVED_SLUGS = new Set(
  [
    "null",
    "create",
    "templates",
    "new",
    "api",
    "folders",
    "by-slug",
    "design",
    "analytics",
    "submissions",
    "share",
    "embed",
    "preview",
    "login",
    "signup",
    "logout",
    "register",
    "forgot-password",
    "reset-password",
    "verify-email",
    "email-verification",
    "email-confirmation",
  ].map((s) => s.toLowerCase()),
);

function collapseHyphens(s: string): string {
  return s.replace(/-{2,}/g, "-");
}

/**
 * Normalizes user input into a URL path segment.
 */
export function normalizeUrlSlug(raw: string): string {
  if (!raw?.trim()) {
    return EMPTY_STRING;
  }

  const trimmed = raw.trim().toLowerCase();
  let out = EMPTY_STRING;
  for (const ch of trimmed) {
    if (ch === " " || ch === "_" || ch === ".") {
      out += HYPHEN_CHAR;
    } else if (/[a-z0-9-]/.test(ch)) {
      out += ch;
    }
  }

  let collapsed = collapseHyphens(out)
    .replace(/^-+/, EMPTY_STRING)
    .replace(/-+$/, EMPTY_STRING);
  collapsed = collapseHyphens(collapsed);
  if (collapsed.length > MAX_URL_SLUG_LENGTH) {
    collapsed = collapsed
      .slice(0, MAX_URL_SLUG_LENGTH)
      .replace(/^-+/, EMPTY_STRING)
      .replace(/-+$/, EMPTY_STRING);
    collapsed = collapseHyphens(collapsed);
  }

  return collapsed;
}

/**
 * Produces a URL slug from a display name.
 */
export function urlSlugFromDisplayName(name: string): string {
  return normalizeUrlSlug(name);
}

/**
 * Checks if a URL slug is reserved.
 */
export function isReservedUrlSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Checks if a URL slug is valid.
 */
export function isValidUrlSlugFormat(slug: string): boolean {
  if (!slug?.trim() || slug.length > MAX_URL_SLUG_LENGTH) {
    return false;
  }

  if (slug.startsWith(HYPHEN_CHAR) || slug.endsWith(HYPHEN_CHAR)) {
    return false;
  }

  for (const ch of slug) {
    if (!/[a-z0-9-]/.test(ch)) {
      return false;
    }
  }

  return true;
}
