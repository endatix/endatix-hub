/**
 * The copy `ErrorPage` renders, named exactly as its props so a presentation can be
 * handed over whole:
 *
 * ```tsx
 * <ErrorPage {...presentation} />                  // as authored
 * <ErrorPage {...presentation} title="Custom" />   // override one field
 * ```
 *
 * Overriding is therefore plain JSX — later props win — rather than a second
 * override channel on the component. Keep these names in step with `ErrorPageProps`.
 */
export interface ErrorPresentation {
  /**
   * HTTP status behind the failure, painted as the watermark. Omit for none.
   *
   * This is the status, never a support code: a stopped API is `503`, and labelling
   * it `401` tells the reader their credentials were rejected when the server was
   * never reached. Surfaces that also show a support code name it `supportCode`.
   */
  code?: string;
  /** Short label above the headline. Names the category; the title is the sentence. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  message: string;
}

/**
 * Looks up a presentation by key, falling back when the key is missing or unknown.
 *
 * Every error surface needs this and each had spelled it differently — `in` plus an
 * index, `?? FALLBACK`, a `switch` default — which is how the auth page ended up
 * with a lookup that read nothing like the one next to it.
 */
export function resolveErrorPresentation<T extends ErrorPresentation>(
  map: Readonly<Partial<Record<string, T>>>,
  key: string | undefined,
  fallback: T,
): T {
  // Own properties only. The key is caller-supplied - an `?error=` query param, an
  // API error code - so a plain index would resolve `toString` to a function off
  // Object.prototype and hand it to the renderer as a presentation.
  if (key === undefined || !Object.prototype.hasOwnProperty.call(map, key)) {
    return fallback;
  }

  return map[key] ?? fallback;
}
