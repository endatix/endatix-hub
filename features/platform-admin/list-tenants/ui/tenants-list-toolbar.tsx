"use client";

import {
  DataTableToolbar,
  ResetFiltersButton,
  TableSearchInput,
} from "@/components/table";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { listUrlStateFromSearchParams } from "../utils";

export function TenantsListToolbar() {
  const { search, setSearch, updateUrl, searchParams, isPending } =
    useListUrlState();
  const urlState = listUrlStateFromSearchParams(searchParams);
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
            placeholder="Search by name, tenant slug, or description"
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
