"use client";

import { useDebouncedUrlSearch } from "@/lib/utils/hooks/use-debounced-url-search.hook";
import { useUrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";

const DEFAULT_DEBOUNCE_MS = 350;

export function useListUrlState(
  searchParamKey = "search",
  debounceMs = DEFAULT_DEBOUNCE_MS,
) {
  const { searchParams, updateUrl, isPending } = useUrlSearchParamsUpdater();
  const urlSearch = searchParams.get(searchParamKey) ?? "";
  const { search, setSearch } = useDebouncedUrlSearch({
    debounceMs,
    searchParam: searchParamKey,
    urlSearch,
    updateUrl,
  });

  return { search, setSearch, urlSearch, updateUrl, searchParams, isPending };
}
