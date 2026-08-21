"use client";

import { FacetedFilter, TableSearchInput } from "@/components/table";
import { Button } from "@/components/ui/button";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { X } from "lucide-react";
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
    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <TableSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or description"
        ariaLabel="Search data lists"
      />
      <div className="flex max-w-full min-w-0 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="shrink-0 px-2 lg:px-3"
          >
            Reset Filters
            <X className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
