"use client";

import {
  DataTableToolbar,
  FacetedFilter,
  ResetFiltersButton,
  TableSearchInput,
  useListUrlState,
} from "@/components/table";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { type ReactNode, useMemo } from "react";
import {
  listUrlStateFromSearchParams,
  parseHasLocaleFilterSet,
  serializeHasLocaleFilter,
} from "../utils";

type DataListsListToolbarProps = {
  /** Streamed locale facet (Suspense). Keeps search/reset outside that boundary. */
  localeFilter?: ReactNode;
};

export function DataListsListToolbar({
  localeFilter,
}: Readonly<DataListsListToolbarProps>) {
  const { search, setSearch, updateUrl, searchParams, isPending } =
    useListUrlState();
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

  const resetFilters = (): void => {
    setSearch("");
    updateUrl({
      search: null,
      hasLocale: null,
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
      hasLocale: null,
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
      className="mt-6"
      isPending={isPending}
      filters={
        <>
          <TableSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or description"
            ariaLabel="Search data lists"
            className="min-w-[12rem] flex-none lg:flex-1"
          />
          {localeFilter}
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
