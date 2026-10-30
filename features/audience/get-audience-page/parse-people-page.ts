import {
  AudiencePaging,
  MAX_AUDIENCE_SEARCH_LENGTH,
  AudiencePeopleTestFilter,
  isAudiencePeopleTestFilter,
} from "@/lib/endatix-api/audience/types";
import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";

export type PeoplePaging = { page: number; pageSize: number };

/** What the people list asks the API for: a page, the All / Real / Test filter and the search. */
export type PeopleQuery = PeoplePaging & {
  test: AudiencePeopleTestFilter;
  search: string;
};

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

/** `q` from the URL, trimmed and cut to the longest search the API takes; blank is no search. */
export function parsePeopleSearch(value: string | undefined): string {
  return (value ?? "").slice(0, MAX_AUDIENCE_SEARCH_LENGTH).trim();
}

/** The URL value for a filter; the default `all` is left out of the URL. */
export function peopleTestFilterUrlValue(
  filter: AudiencePeopleTestFilter,
): string | null {
  return filter === AudiencePeopleTestFilter.All ? null : filter;
}
