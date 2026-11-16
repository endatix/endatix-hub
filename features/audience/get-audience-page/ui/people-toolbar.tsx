"use client";

import type { ReactNode } from "react";
import {
  DataTableFilter,
  DataTableToolbar,
  TableSearchInput,
  useListUrlState,
} from "@/components/table";
import { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";
import {
  CLEAR_PEOPLE_FILTERS,
  PEOPLE_SEARCH_PARAM,
} from "../parse-people-page";
import { PeopleTestFilter } from "./people-test-filter";

type PeopleToolbarProps = {
  testFilter: AudiencePeopleTestFilter;
  /** Pinned at the end, such as Clear selection. */
  actions?: ReactNode;
};

/** Search by identifier (`?search=`, debounced) and All / Real / Test, above the list. */
export function PeopleToolbar({
  testFilter,
  actions,
}: Readonly<PeopleToolbarProps>) {
  const { search, setSearch, updateUrl } = useListUrlState(PEOPLE_SEARCH_PARAM);
  const isTestFiltered = testFilter !== AudiencePeopleTestFilter.All;
  return (
    <DataTableToolbar
      search={
        <TableSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by identifier"
          ariaLabel="Search participants by identifier"
          className="min-w-[12rem] md:flex-none lg:flex-1"
        />
      }
      filters={
        <DataTableFilter label="Participants">
          {({ id }) => <PeopleTestFilter value={testFilter} id={id} />}
        </DataTableFilter>
      }
      activeFilterCount={isTestFiltered ? 1 : 0}
      reset={{
        onClick: () => {
          setSearch("");
          updateUrl(CLEAR_PEOPLE_FILTERS);
        },
        hasFilters: Boolean(search.trim()) || isTestFiltered,
      }}
      actions={actions}
    />
  );
}
