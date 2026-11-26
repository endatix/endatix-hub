import "server-only";
import type { EndatixApi } from "@/lib/endatix-api";
import { normalizePagedResponse, type NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { appendPagingQueryParams, buildEndpointWithQuery } from "@/lib/endatix-api/shared/query-params";
import type { IPagedRequest, PagedResponse } from "@/lib/endatix-api/shared/types";
import { toResult } from "@/lib/result";
import { documentsPath, options } from "./document-api.server";
import type { DocumentKind, Publication } from "./documents";

export function buildVersionHistoryEndpoint(kind: DocumentKind, paging: IPagedRequest) {
  const params = new URLSearchParams();
  appendPagingQueryParams(params, paging, {page: 1, pageSize: 10});
  return buildEndpointWithQuery(`${documentsPath}/${kind}/versions`, params);
}

export async function readVersions(api: EndatixApi, kind: DocumentKind, paging: IPagedRequest) {
  const response = await api.get<PagedResponse<Publication>>(buildVersionHistoryEndpoint(kind, paging));
  return toResult<PagedResponse<Publication>, NormalizedPagedResponse<Publication>>(response, {
    ...options, mapData: normalizePagedResponse<Publication>,
  });
}
