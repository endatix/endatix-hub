import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";

const CLEAR_SORT = { sortBy: null, sortDir: null } as const;

/**
 * One Reset for a list: the toolbar's Reset, the Filters drawer's Reset and the empty state's
 * Clear filters all take `clearFilters` from here, so they clear the same thing (DESIGN.md §5
 * Empty states). `filterKeys` are the URL keys the list's filters write; `search` is always one.
 */
export function listFilterReset(
  setSearch: (value: string) => void,
  updateUrl: UrlSearchParamsUpdater,
  filterKeys: readonly string[],
) {
  const clear = Object.fromEntries(
    ["search", ...filterKeys].map((key) => [key, null]),
  );
  return {
    clearFilters: () => {
      setSearch("");
      updateUrl({ ...clear, page: "1" });
    },
    clearSorting: () => updateUrl({ ...CLEAR_SORT, page: "1" }),
    clearAll: () => {
      setSearch("");
      updateUrl({ ...clear, ...CLEAR_SORT, page: "1" });
    },
  };
}

export type ListFilterReset = ReturnType<typeof listFilterReset>;
