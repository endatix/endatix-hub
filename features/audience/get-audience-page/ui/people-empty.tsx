"use client";

import { Users } from "lucide-react";
import { DataTableEmpty } from "@/components/table";
import { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";
import { useUrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { PEOPLE_SEARCH_PARAM } from "./people-toolbar";

type EmptyCopy = { title: string; body: string };

const SEARCH_EMPTY: EmptyCopy = {
  title: "No participants match",
  body: "No participant on this form has an identifier that contains the search.",
};

const FILTERED_EMPTY: Record<string, EmptyCopy> = {
  [AudiencePeopleTestFilter.Real]: {
    title: "No real participants",
    body: "No participant on this form is a real participant.",
  },
  [AudiencePeopleTestFilter.Test]: {
    title: "No test participants",
    body: "No participant on this form is a test participant. Add a test participant, or import participants as test participants, to try the form as them.",
  },
};

/** Nobody matches the search or the Real or Test filter; Clear filters goes back to everyone. */
function FilteredEmpty({ title, body }: Readonly<EmptyCopy>) {
  const { updateUrl } = useUrlSearchParamsUpdater();
  const clear = () =>
    updateUrl({ test: null, [PEOPLE_SEARCH_PARAM]: null, page: "1" });
  return (
    <DataTableEmpty icon={Users} title={title} onClearFilters={clear}>
      {body}
    </DataTableEmpty>
  );
}

/** No participants yet, or none the search or the Real or Test filter keeps. */
export function PeopleEmpty({
  testFilter,
  search,
}: Readonly<{ testFilter: AudiencePeopleTestFilter; search: string }>) {
  const filtered = search ? SEARCH_EMPTY : FILTERED_EMPTY[testFilter];
  if (filtered) return <FilteredEmpty {...filtered} />;
  return (
    <DataTableEmpty icon={Users} title="No participants yet">
      Add the participants this form is for, one at a time or from a CSV file.
      Each participant can have their own value for every property.
    </DataTableEmpty>
  );
}
