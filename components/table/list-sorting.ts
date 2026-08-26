import type { SortingState } from "@tanstack/react-table";

/**
 * Maps list URL `sortBy` / `sortDir` onto TanStack `SortingState`.
 */
export function sortingStateFromUrl(
  sortBy: string | undefined,
  sortDir: string | undefined,
): SortingState {
  if (!sortBy) {
    return [];
  }

  return [{ id: sortBy, desc: sortDir !== "asc" }];
}

/**
 * Maps TanStack sorting into list URL updates (`page` resets to 1).
 */
export function sortingUrlUpdatesFromState(
  sorting: SortingState,
): Record<string, string | null> {
  const first = sorting[0];
  if (!first) {
    return { sortBy: null, sortDir: null, page: "1" };
  }

  return {
    sortBy: first.id,
    sortDir: first.desc ? "desc" : "asc",
    page: "1",
  };
}
