/** Neutral fallback used before the survey's own theme is known (or if it never defines a dim background), so fill mode never leaves a transparent gap. */
export const DEFAULT_FILL_BACKGROUND_COLOR = "#f3f3f3";

export function isFillHeightMode(value: string | null | undefined): boolean {
  return value === "fill";
}

const EMBED_ID_PATTERN = /^[a-zA-Z0-9:_-]{1,128}$/;

/**
 * Same format check the parent-page SDK's generated embedId always matches
 * (see createEmbedId in src/embed/embed.ts). Shared so the server-rendered
 * embed page and the client-side messaging context agree on what counts as
 * a genuine embed.js load, not just "some non-empty string was in the URL".
 */
export function isValidEmbedId(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && EMBED_ID_PATTERN.test(value);
}
