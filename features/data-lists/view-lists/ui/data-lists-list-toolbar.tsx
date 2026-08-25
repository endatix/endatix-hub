"use client";

import {
  FacetedFilter,
  TableSearchInput,
} from "@/components/table";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { useMemo } from "react";
import {
  parseHasLocaleFilterSet,
  serializeHasLocaleFilter,
} from "../utils";
import { getSurveyLocaleFilterOptions } from "./locale-filter-options";

export function DataListsListToolbar() {
  const { search, setSearch, updateUrl, searchParams } = useListUrlState();
  const localeOptions = useMemo(() => getSurveyLocaleFilterOptions(), []);
  const selectedLocales = useMemo(
    () => parseHasLocaleFilterSet(searchParams.get("hasLocale")),
    [searchParams],
  );

  return (
    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <TableSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or description"
        ariaLabel="Search data lists"
      />
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
    </div>
  );
}
