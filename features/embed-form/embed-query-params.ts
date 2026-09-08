/**
 * Query keys `embed.js` appends to the iframe URL for postMessage routing and layout.
 * Framework-free: imported by both the Next app and the esbuild embed bundle.
 */
export const EMBED_ID_QUERY_PARAM = "embedId";
export const PARENT_ORIGIN_QUERY_PARAM = "parentOrigin";
export const HEIGHT_MODE_QUERY_PARAM = "heightMode";

/** Reserved for the embed handshake — never treated as public-form prefill. */
export const EMBED_RESERVED_QUERY_PARAMS = [
  EMBED_ID_QUERY_PARAM,
  PARENT_ORIGIN_QUERY_PARAM,
  HEIGHT_MODE_QUERY_PARAM,
] as const;
