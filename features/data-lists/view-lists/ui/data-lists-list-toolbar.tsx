"use client";

import { FacetedFilter, TableSearchInput } from "@/components/table";
import { Button } from "@/components/ui/button";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { X } from "lucide-react";
import { Suspense, use, useMemo } from "react";
import {
  listUrlStateFromSearchParams,
  parseHasLocaleFilterSet,
  serializeHasLocaleFilter,
} from "../utils";

type DataListsListToolbarProps = {
  localesPromise: Promise<string[]>;
};

export function DataListsListToolbar({
  localesPromise,
}: Readonly<DataListsListToolbarProps>) {
  const { search, setSearch, updateUrl, searchParams } = useListUrlState();
  const urlState = listUrlStateFromSearchParams(searchParams);
  const selectedLocales = useMemo(
    () => parseHasLocaleFilterSet(searchParams.get("hasLocale")),
    [searchParams],
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
        <Suspense fallback={<LocaleFilterFallback />}>
          <DataListsLocaleFilter
            localesPromise={localesPromise}
            selectedLocales={selectedLocales}
            onValueChange={(values) => {
              updateUrl({
                hasLocale: serializeHasLocaleFilter(values) ?? null,
                page: "1",
              });
            }}
          />
        </Suspense>
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

function LocaleFilterFallback() {
  return (
    <Button
      type="button"
      variant="outline"
      disabled
      className="rounded-full border-dashed"
    >
      Locale
    </Button>
  );
}

function DataListsLocaleFilter({
  localesPromise,
  selectedLocales,
  onValueChange,
}: Readonly<{
  localesPromise: Promise<string[]>;
  selectedLocales: Set<string>;
  onValueChange: (values: Set<string>) => void;
}>) {
  const tenantLocales = use(localesPromise);
  const options = useMemo(
    () =>
      tenantLocales.map((value) => ({
        value,
        label: formatLocaleLabel(value),
      })),
    [tenantLocales],
  );

  if (options.length === 0) {
    return null;
  }

  return (
    <FacetedFilter
      title="Locale"
      options={options}
      selectedValues={selectedLocales}
      onValueChange={onValueChange}
    />
  );
}
