"use client";

import { useMemo } from "react";
import type { SortingState, Updater } from "@tanstack/react-table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import type { DateFilterValue } from "./date-filter-types";
import {
  sortingStateFromUrl,
  sortingUrlUpdatesFromState,
} from "./list-sorting";

/** The slice of a list page's URL state that drives sorting and date filters. */
export interface ListTableUrlState {
  sortBy?: string;
  sortDir?: string;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
}

/**
 * URL-backed sorting plus created/modified date filters, in the shape TanStack
 * and `auditDateColumns` expect. One definition of "sorted by" for every list.
 */
export function useListTableState(
  urlState: ListTableUrlState,
  updateUrl: UrlSearchParamsUpdater,
) {
  const sorting = useMemo(
    () => sortingStateFromUrl(urlState.sortBy, urlState.sortDir),
    [urlState.sortBy, urlState.sortDir],
  );

  const created: DateFilterValue = useMemo(
    () => ({ from: urlState.createdFrom, to: urlState.createdTo }),
    [urlState.createdFrom, urlState.createdTo],
  );

  const modified: DateFilterValue = useMemo(
    () => ({ from: urlState.modifiedFrom, to: urlState.modifiedTo }),
    [urlState.modifiedFrom, urlState.modifiedTo],
  );

  const onSortingChange = (updater: Updater<SortingState>) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    updateUrl(sortingUrlUpdatesFromState(next));
  };

  return { sorting, created, modified, onSortingChange };
}
