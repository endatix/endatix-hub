/**
 * Query keys embed.js appends to the iframe URL for postMessage routing and
 * layout. Public-form prefill must ignore these — otherwise every embed load
 * looks like “prefill changed” and enqueues an empty partial submission.
 *
 * Shared with `src/embed/embed.ts` (esbuild bundle) so the names stay one source.
 */
export const EMBED_ID_QUERY_PARAM = "embedId";
export const PARENT_ORIGIN_QUERY_PARAM = "parentOrigin";
export const HEIGHT_MODE_QUERY_PARAM = "heightMode";

export const EMBED_RESERVED_QUERY_PARAMS = [
  EMBED_ID_QUERY_PARAM,
  PARENT_ORIGIN_QUERY_PARAM,
  HEIGHT_MODE_QUERY_PARAM,
] as const;
