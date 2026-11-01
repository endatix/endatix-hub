"use client";

import type { ReactNode } from "react";
import {
  DataTableToolbar,
  TableSearchInput,
  useListUrlState,
} from "@/components/table";
import type { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";
import { PEOPLE_SEARCH_PARAM } from "../parse-people-page";
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
  return <DataTableToolbar filters={filters} actions={actions} />;
}
