"use client";

import { useEffect, useState } from "react";
import type { UrlSearchParamsUpdater } from "./use-url-search-params-updater.hook";

const DEFAULT_DEBOUNCE_MS = 350;
const DEFAULT_SEARCH_PARAM = "search";

interface UseDebouncedUrlSearchOptions {
  debounceMs?: number;
  searchParam?: string;
  urlSearch: string;
  updateUrl: UrlSearchParamsUpdater;
}

/**
 * A hook that provides a debounced search function for the URL search params.
 * @param debounceMs - The debounce time in milliseconds.
 * @param searchParam - The search parameter to use.
 * @param urlSearch - The initial search value.
 * @param updateUrl - The function to update the URL search params.
 * @returns An object with the current search value and the function to set the search value.
 */
export function useDebouncedUrlSearch({
  debounceMs = DEFAULT_DEBOUNCE_MS,
  searchParam = DEFAULT_SEARCH_PARAM,
  urlSearch,
  updateUrl,
}: UseDebouncedUrlSearchOptions) {
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const trimmedSearch = search.trim();
    if (trimmedSearch === urlSearch) {
      return;
    }

    const timeout = globalThis.window.setTimeout(() => {
      updateUrl({
        [searchParam]: trimmedSearch || null,
        page: "1",
      });
    }, debounceMs);

    return () => globalThis.window.clearTimeout(timeout);
  }, [debounceMs, search, searchParam, updateUrl, urlSearch]);

  return { search, setSearch };
}
