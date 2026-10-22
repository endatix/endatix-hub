import { AudiencePaging } from "@/lib/endatix-api/audience/types";
import { AudienceView, parseAudienceView } from "./audience-view";
import {
  parsePeoplePaging,
  parsePeopleTestFilter,
  peopleTestFilterUrlValue,
} from "./parse-people-page";

/** `tableKey` for Audience → participant back navigation (`lib/list-page/table-return-to`). */
export const AUDIENCE_TABLE_KEY = "audience";

type AudienceListQuery = {
  page?: string;
  pageSize?: string;
  view?: string;
  test?: string;
};

/**
 * The list's own query: paging clamped, `view` and `test` validated, defaults and
 * unknown keys left out. The same string `rememberTableReturnTo` stores and reads.
 */
export function audienceListSearch(raw: AudienceListQuery): string {
  const paging = parsePeoplePaging(raw);
  const params = new URLSearchParams();
  if (paging.page > 1) params.set("page", String(paging.page));
  if (paging.pageSize !== AudiencePaging.DefaultPageSize) {
    params.set("pageSize", String(paging.pageSize));
  }
  const view = parseAudienceView(raw.view);
  if (view !== AudienceView.People) params.set("view", view);
  const test = peopleTestFilterUrlValue(parsePeopleTestFilter(raw.test));
  if (test) params.set("test", test);
  return params.toString();
}

/** Re-parse a stored query. `parse` for `rememberTableReturnTo` / `getTableReturnHref`. */
export function parseAudienceReturnQuery(query: string): string {
  const raw = new URLSearchParams(query);
  return audienceListSearch({
    page: raw.get("page") ?? undefined,
    pageSize: raw.get("pageSize") ?? undefined,
    view: raw.get("view") ?? undefined,
    test: raw.get("test") ?? undefined,
  });
}
