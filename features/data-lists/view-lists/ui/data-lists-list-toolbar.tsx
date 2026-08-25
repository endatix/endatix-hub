"use client";

import {
  DataTableToolbar,
  FacetedFilter,
  ResetFiltersButton,
  TableSearchInput,
} from "@/components/table";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { useMemo } from "react";
import {
  listUrlStateFromSearchParams,
  parseHasLocaleFilterSet,
  serializeHasLocaleFilter,
} from "../utils";

type DataListsListToolbarProps = {
  /** Tenant catalog locales (resolved on the server — avoid Suspense remounts). */
  locales: readonly string[];
};

export function DataListsListToolbar({
  locales,
}: Readonly<DataListsListToolbarProps>) {
  const { search, setSearch, updateUrl, searchParams } = useListUrlState();
  const urlState = listUrlStateFromSearchParams(searchParams);
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
  const hasActiveFilters = Boolean(
    search.trim() ||
    urlState.hasLocale ||
    urlState.createdFrom ||
    urlState.createdTo ||
    urlState.modifiedFrom ||
    urlState.modifiedTo,
  );

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

  return (
    <DataTableToolbar
      className="mt-6"
      filters={
        <>
          <TableSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or description"
            ariaLabel="Search data lists"
            className="min-w-[12rem] flex-none lg:flex-1"
          />
          {localeOptions.length > 0 ? (
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
          ) : null}
          {hasActiveFilters ? (
            <ResetFiltersButton onClick={resetFilters} />
          ) : null}
        </>
      }
    />
  );
}
