import { AudiencePaging } from "@/lib/endatix-api/audience/types";
import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";

export type PeoplePaging = { page: number; pageSize: number };

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
