/** Iframe query keys for postMessage/layout. Framework-free: `src/embed` and the Next app both import this. Not public-form prefill. */
export const EMBED_ID_QUERY_PARAM = "embedId";
export const PARENT_ORIGIN_QUERY_PARAM = "parentOrigin";
export const HEIGHT_MODE_QUERY_PARAM = "heightMode";

export const EMBED_RESERVED_QUERY_PARAMS = [
  EMBED_ID_QUERY_PARAM,
  PARENT_ORIGIN_QUERY_PARAM,
  HEIGHT_MODE_QUERY_PARAM,
] as const;
