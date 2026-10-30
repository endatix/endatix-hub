"use client";

import {
  DataTableToolbar,
  TableSearchInput,
  useListUrlState,
} from "@/components/table";
import type { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";
import { PeopleTestFilter } from "./people-test-filter";

/** The URL key of the identifier search; Back from a participant restores it. */
export const PEOPLE_SEARCH_PARAM = "q";

/** Search by identifier (`?q=`, debounced) and All / Real / Test, above the list. */
export function PeopleToolbar({
  testFilter,
}: Readonly<{ testFilter: AudiencePeopleTestFilter }>) {
  const { search, setSearch } = useListUrlState(PEOPLE_SEARCH_PARAM);
  const filters = (
    <>
      <TableSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by identifier"
        ariaLabel="Search participants by identifier"
        className="min-w-[12rem] flex-none lg:flex-1"
      />
      <PeopleTestFilter value={testFilter} />
    </>
  );
  return <DataTableToolbar filters={filters} />;
}
