/** Iframe query keys for postMessage/layout — not public-form prefill. Framework-free. */
export const EMBED_QUERY_PARAMS = {
  embedId: "embedId",
  parentOrigin: "parentOrigin",
  heightMode: "heightMode",
} as const;

export const EMBED_RESERVED_QUERY_PARAMS = Object.values(EMBED_QUERY_PARAMS);
