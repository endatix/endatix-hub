"use client";

import {
  DataTableToolbar,
  TableSearchInput,
  type ListFilterReset,
} from "@/components/table";
import type { TenantsListUrlState } from "../utils";

interface TenantsListToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  urlState: TenantsListUrlState;
  /** Built once in the list shell and shared with the empty state's Clear filters. */
  reset: ListFilterReset;
}

export function TenantsListToolbar({
  search,
  setSearch,
  urlState,
  reset,
}: Readonly<TenantsListToolbarProps>) {
  const hasActiveFilters = Boolean(
    (search ?? "").trim() ||
    urlState.createdFrom ||
    urlState.createdTo ||
    urlState.modifiedFrom ||
    urlState.modifiedTo,
  );
  const hasSorting = Boolean(urlState.sortBy);

  return (
    <DataTableToolbar
      className="mb-4"
      search={
        <TableSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, public id, or description"
          ariaLabel="Search tenants"
          className="min-w-[12rem] md:flex-none lg:flex-1"
        />
      }
      reset={{
        onClick: reset.clearFilters,
        onResetSorting: reset.clearSorting,
        onResetAll: reset.clearAll,
        hasFilters: hasActiveFilters,
        hasSorting,
      }}
    />
  );
}
