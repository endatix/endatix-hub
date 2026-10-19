import {
  AudiencePaging,
  AudiencePeopleTestFilter,
  isAudiencePeopleTestFilter,
} from "@/lib/endatix-api/audience/types";
import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";

export type PeoplePaging = { page: number; pageSize: number };

/** What the people list asks the API for: a page and the All / Real / Test filter. */
export type PeopleQuery = PeoplePaging & { test: AudiencePeopleTestFilter };

/** `page` and `pageSize` from the URL; the size is capped at what the API returns in one page. */
export function parsePeoplePaging(params: {
  page?: string;
  pageSize?: string;
}): PeoplePaging {
  const { page, pageSize } = parsePagedSearchParams(
    params,
    AudiencePaging.DefaultPageSize,
  );
  return { page, pageSize: Math.min(pageSize, AudiencePaging.MaxPageSize) };
}

/** `test` from the URL: `real` or `test`, else the default `all`. */
export function parsePeopleTestFilter(
  value: string | undefined,
): AudiencePeopleTestFilter {
  return value && isAudiencePeopleTestFilter(value)
    ? value
    : AudiencePeopleTestFilter.All;
}

/** The URL value for a filter; the default `all` is left out of the URL. */
export function peopleTestFilterUrlValue(
  filter: AudiencePeopleTestFilter,
): string | null {
  return filter === AudiencePeopleTestFilter.All ? null : filter;
}
