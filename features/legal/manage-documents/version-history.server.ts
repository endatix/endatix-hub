import "server-only";
import type { EndatixApi } from "@/lib/endatix-api";
import { normalizePagedResponse, type NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { appendPagingQueryParams, buildEndpointWithQuery } from "@/lib/endatix-api/shared/query-params";
import type { PagedResponse } from "@/lib/endatix-api/shared/types";
import { toResult } from "@/lib/result";
import { documentsPath, options } from "./document-api.server";
import type { DocumentKind, Publication } from "./documents";

export function buildVersionHistoryEndpoint(kind: DocumentKind, page: number) {
  const params = new URLSearchParams();
  appendPagingQueryParams(params, { page, pageSize: 10 });
  return buildEndpointWithQuery(`${documentsPath}/${kind}/versions`, params);
}

export async function readVersions(api: EndatixApi, kind: DocumentKind, page: number) {
  const response = await api.get<PagedResponse<Publication>>(buildVersionHistoryEndpoint(kind, page));
  return toResult<PagedResponse<Publication>, NormalizedPagedResponse<Publication>>(response, {
    ...options, mapData: normalizePagedResponse<Publication>,
  });
}
