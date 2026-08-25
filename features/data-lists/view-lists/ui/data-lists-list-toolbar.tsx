"use client";

import {
  DataTableToolbar,
  FacetedFilter,
  TableSearchInput,
} from "@/components/table";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { useMemo } from "react";
import { parseHasLocaleFilterSet, serializeHasLocaleFilter } from "../utils";

export function DataListsListToolbar({
  locales = [],
}: Readonly<{ locales?: string[] }>) {
  const { search, setSearch, updateUrl, searchParams } = useListUrlState();
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
        </>
      }
    />
  );
}
