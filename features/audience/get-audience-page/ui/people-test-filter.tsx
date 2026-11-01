"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AudiencePeopleTestFilter,
  isAudiencePeopleTestFilter,
} from "@/lib/endatix-api/audience/types";
import { useUrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { peopleTestFilterUrlValue } from "../parse-people-page";

const OPTIONS = (
  <SelectContent>
    <SelectItem value={AudiencePeopleTestFilter.All}>
      All participants
    </SelectItem>
    <SelectItem value={AudiencePeopleTestFilter.Real}>
      Real participants
    </SelectItem>
    <SelectItem value={AudiencePeopleTestFilter.Test}>
      Test participants
    </SelectItem>
  </SelectContent>
);

const TRIGGER = (
  <SelectTrigger
    className="w-full sm:w-[160px]"
    aria-label="Filter participants by test or real"
  >
    <SelectValue />
  </SelectTrigger>
);

/** All / Real / Test, kept in the URL (`?test=`) and reset to the first page on change. */
export function PeopleTestFilter({
  value,
}: Readonly<{ value: AudiencePeopleTestFilter }>) {
  const { updateUrl } = useUrlSearchParamsUpdater();
  const change = (next: string) => {
    if (!isAudiencePeopleTestFilter(next)) return;
    updateUrl({ test: peopleTestFilterUrlValue(next), page: "1" });
  };
  return (
    <Select value={value} onValueChange={change}>
      {TRIGGER}
      {OPTIONS}
    </Select>
  );
}
