"use client";

import {
  DataTableToolbar,
  ResetFiltersButton,
  TableSearchInput,
} from "@/components/table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import type { TenantsListUrlState } from "../utils";

interface TenantsListToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  updateUrl: UrlSearchParamsUpdater;
  urlState: TenantsListUrlState;
  isPending: boolean;
}

export function TenantsListToolbar({
  search,
  setSearch,
  updateUrl,
  urlState,
  isPending,
}: Readonly<TenantsListToolbarProps>) {
  const hasActiveFilters = Boolean(
    search.trim() ||
    urlState.createdFrom ||
    urlState.createdTo ||
    urlState.modifiedFrom ||
    urlState.modifiedTo,
  );
  const hasSorting = Boolean(urlState.sortBy);

  const resetFilters = (): void => {
    setSearch("");
    updateUrl({
      search: null,
      createdFrom: null,
      createdTo: null,
      modifiedFrom: null,
      modifiedTo: null,
      page: "1",
    });
  };

  const resetSorting = (): void => {
    updateUrl({
      sortBy: null,
      sortDir: null,
      page: "1",
    });
  };

  const resetAll = (): void => {
    setSearch("");
    updateUrl({
      search: null,
      createdFrom: null,
      createdTo: null,
      modifiedFrom: null,
      modifiedTo: null,
      sortBy: null,
      sortDir: null,
      page: "1",
    });
  };

  return (
    <DataTableToolbar
      className="mb-4"
      isPending={isPending}
      filters={
        <>
          <TableSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, public id, or description"
            ariaLabel="Search tenants"
            className="min-w-[12rem] flex-none lg:flex-1"
          />
          <ResetFiltersButton
            onClick={resetFilters}
            onResetSorting={resetSorting}
            onResetAll={resetAll}
            hasFilters={hasActiveFilters}
            hasSorting={hasSorting}
          />
        </>
      }
    />
  );
}
