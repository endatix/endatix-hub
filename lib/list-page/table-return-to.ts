"use client";

function storageKey(tableKey: string, scopeId?: string): string {
  return scopeId
    ? `ehx_table_return_${tableKey}_${scopeId}`
    : `ehx_table_return_${tableKey}`;
}

/**
 * Session-scoped "detail → list" back navigation, keyed by `tableKey` (e.g.
 * `"data-lists"`, `"submissions"`) and an optional `scopeId` for tables that
 * are per-parent-entity (e.g. a formId).
 *
 * This module only stores/retrieves strings — it does not know a table's
 * filter shape. Callers MUST supply a `parse` function (the same
 * `parse*ListParams` + `serialize*ListSearchParams` round-trip the list
 * page itself uses) on both `rememberTableReturnTo` and
 * `getTableReturnHref`. That round-trip is what makes this safe to reuse as
 * navigation state: only known keys survive, each is normalized/typed
 * (paging clamped to positive ints, enums/culture-codes validated, free
 * text left as inert filter state — never a path or origin). Never pass a
 * function that returns raw/unvalidated input, and never use a stored value
 * as a redirect target directly.
 */

/**
 * Remembers a list page's current query string for `tableKey` (+
 * `scopeId`). `search` is typically `useSearchParams().toString()`.
 */
export function rememberTableReturnTo(
  tableKey: string,
  search: string,
  parse: (query: string) => string,
  scopeId?: string,
): void {
  if (globalThis.window === undefined) {
    return;
  }

  const query = search.startsWith("?") ? search.slice(1) : search;

  try {
    globalThis.sessionStorage.setItem(
      storageKey(tableKey, scopeId),
      parse(query),
    );
  } catch {
    // Quota / private mode / parse threw — ignore; Back falls back to the
    // caller's bare list path.
  }
}

/**
 * Builds the return href for `tableKey` (+ `scopeId`). Re-runs the
 * remembered query through `parse` again — defense in depth, since a value
 * written by an older app version (or edited via devtools/extensions)
 * should never be trusted without re-validation — then hands the result to
 * `buildHref`. Falls back to `fallbackHref` when nothing is remembered,
 * storage is unavailable, or parsing throws/empties.
 */
export function getTableReturnHref(
  tableKey: string,
  fallbackHref: string,
  parse: (query: string) => string,
  buildHref: (query: string) => string,
  scopeId?: string,
): string {
  if (globalThis.window === undefined) {
    return fallbackHref;
  }

  try {
    const stored = globalThis.sessionStorage.getItem(
      storageKey(tableKey, scopeId),
    );
    if (stored == null || stored.trim() === "") {
      return fallbackHref;
    }

    const query = parse(stored);
    return query ? buildHref(query) : fallbackHref;
  } catch {
    return fallbackHref;
  }
}

export function clearTableReturnTo(tableKey: string, scopeId?: string): void {
  if (globalThis.window === undefined) {
    return;
  }

  try {
    globalThis.sessionStorage.removeItem(storageKey(tableKey, scopeId));
  } catch {
    // ignore
  }
}
