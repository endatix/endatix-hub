"use client";

import { useEffect, useState } from "react";
import {
  useUrlSearchParamsUpdater,
  type UrlSearchParamsUpdater,
} from "@/lib/utils/hooks/use-url-search-params-updater.hook";

const DEFAULT_DEBOUNCE_MS = 350;

export interface UseTableFiltersUrlStateResult {
  /** Current (possibly not-yet-committed) value for each key. */
  values: Record<string, string>;
  /** Updates one field's local value; the whole set commits together after `debounceMs`. */
  setValue: (key: string, value: string) => void;
  searchParams: URLSearchParams;
  updateUrl: UrlSearchParamsUpdater;
}

function readUrlValues(
  keys: readonly string[],
  searchParams: URLSearchParams,
): Record<string, string> {
  return Object.fromEntries(
    keys.map((key) => [key, searchParams.get(key) ?? ""]),
  );
}

/**
 * Debounced, URL-backed state for N table filter fields (a search box plus
 * one or more free-text filters), committed to the URL in a single
 * coalesced `updateUrl` call per settle window.
 *
 * `keys` must be a stable reference — a module-level constant array (e.g.
 * `const FILTER_KEYS = ["search", "hasLocale"] as const;`), not an inline
 * array literal — since it drives this hook's effect dependencies.
 *
 * Do not also call `useListUrlState` / `useUrlSearchParamsUpdater` for
 * another debounced filter on the same table: two independent debounced
 * writers race — each rebuilds the URL from its own `searchParams`
 * snapshot at the moment its timer fires, so whichever settles second can
 * silently drop the other's just-committed change. List every debounced
 * filter key here instead so there is exactly one writer per settle
 * window.
 *
 * Always resets `page` to `"1"` when any field's committed value changes.
 * Non-debounced filters (`Select`s, checkboxes, etc.) should call
 * `updateUrl` directly instead of going through this hook.
 */
export function useTableFiltersUrlState(
  keys: readonly string[],
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): UseTableFiltersUrlStateResult {
  const { searchParams, updateUrl } = useUrlSearchParamsUpdater();
  const [values, setValues] = useState<Record<string, string>>(() =>
    readUrlValues(keys, searchParams),
  );

  // URL changed from outside this hook (back/forward, footer paging,
  // another control) — resync local state.
  useEffect(() => {
    setValues(readUrlValues(keys, searchParams));
  }, [keys, searchParams]);

  useEffect(() => {
    const urlValues = readUrlValues(keys, searchParams);
    const trimmed = Object.fromEntries(
      keys.map((key) => [key, (values[key] ?? "").trim()]),
    );
    const changed = keys.some((key) => trimmed[key] !== urlValues[key]);
    if (!changed) {
      return;
    }

    const timeout = globalThis.window.setTimeout(() => {
      updateUrl({
        ...Object.fromEntries(keys.map((key) => [key, trimmed[key] || null])),
        page: "1",
      });
    }, debounceMs);

    return () => globalThis.window.clearTimeout(timeout);
  }, [keys, values, searchParams, updateUrl, debounceMs]);

  const setValue = (key: string, value: string): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return { values, setValue, searchParams, updateUrl };
}
