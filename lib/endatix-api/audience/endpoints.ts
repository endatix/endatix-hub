import {
  appendPagingQueryParams,
  buildEndpointWithQuery,
} from "../shared/query-params";
import { formAudiencePath } from "./mappers";
import {
  AudiencePaging,
  AudiencePeopleTestFilter,
  type ListAudiencePeopleRequest,
} from "./types";

const DEFAULT_PAGE = 1;

export function buildListAudiencePeopleEndpoint(
  formId: string,
  request: ListAudiencePeopleRequest = {},
): string {
  const searchParams = new URLSearchParams();
  appendPagingQueryParams(searchParams, request, {
    page: DEFAULT_PAGE,
    pageSize: AudiencePaging.DefaultPageSize,
  });
  if (request.test && request.test !== AudiencePeopleTestFilter.All) {
    searchParams.set("test", request.test);
  }
  const search = request.search?.trim();
  if (search) searchParams.set("search", search);
  return buildEndpointWithQuery(
    formAudiencePath(formId, "people"),
    searchParams,
  );
}

/** `links/preview`, with `search` only when it is not blank. */
export function buildLinksPreviewEndpoint(
  formId: string,
  search: string,
): string {
  const searchParams = new URLSearchParams();
  const trimmed = search.trim();
  if (trimmed) searchParams.set("search", trimmed);
  return buildEndpointWithQuery(
    formAudiencePath(formId, "links", "preview"),
    searchParams,
  );
}

/** A blank search is no filter: every real participant. */
export function linkBatchBody(search: string) {
  const trimmed = search.trim();
  return trimmed ? { filter: { search: trimmed } } : {};
}
