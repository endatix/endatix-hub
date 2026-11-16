"use client";

import {
  DataTableToolbar,
  FacetedFilter,
  listFilterReset,
  TableSearchInput,
  useListUrlState,
} from "@/components/table";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { type ReactNode, useMemo } from "react";
import {
  DATA_LIST_FILTER_KEYS,
  listUrlStateFromSearchParams,
  parseHasLocaleFilterSet,
  serializeHasLocaleFilter,
} from "../utils";

type DataListsListToolbarProps = {
  /** Streamed locale facet (Suspense). Keeps search/reset outside that boundary. */
  localeFilter?: ReactNode;
  search: string;
  setSearch: (value: string) => void;
  updateUrl: UrlSearchParamsUpdater;
  searchParams: URLSearchParams;
};

export function DataListsListToolbar({
  localeFilter,
  search,
  setSearch,
  updateUrl,
  searchParams,
}: Readonly<DataListsListToolbarProps>) {
  const urlState = listUrlStateFromSearchParams(searchParams);
  const hasActiveFilters = Boolean(
    search.trim() ||
    urlState.hasLocale ||
    urlState.createdFrom ||
    urlState.createdTo ||
    urlState.modifiedFrom ||
    urlState.modifiedTo,
  );
  const hasSorting = Boolean(urlState.sortBy);

  const reset = listFilterReset(setSearch, updateUrl, DATA_LIST_FILTER_KEYS);

  return (
    <DataTableToolbar
      className="mt-6"
      search={
        <TableSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or description"
          ariaLabel="Search data lists"
          className="min-w-[12rem] md:flex-none lg:flex-1"
        />
      }
      filters={localeFilter}
      activeFilterCount={urlState.hasLocale ? 1 : 0}
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

type DataListsLocaleFacetProps = {
  locales: readonly string[];
};

/** Locale FacetedFilter only — mounted after catalog resolves so toolbar shell stays stable. */
export function DataListsLocaleFacet({
  locales,
}: Readonly<DataListsLocaleFacetProps>) {
  const { updateUrl, searchParams } = useListUrlState();
  const selectedLocales = useMemo(
    () => parseHasLocaleFilterSet(searchParams.get("hasLocale")),
    [searchParams],
  );
  const localeOptions = useMemo(
    () =>
      locales.map((value) => ({
        value,
        label: formatLocaleLabel(value),
      })),
    [locales],
  );

  if (localeOptions.length === 0) {
    return null;
  }

  return (
    <FacetedFilter
      title="Locale"
      options={localeOptions}
      selectedValues={selectedLocales}
      onValueChange={(values) => {
        updateUrl({
          hasLocale: serializeHasLocaleFilter(values) ?? null,
          page: "1",
        });
      }}
    />
  );
}
