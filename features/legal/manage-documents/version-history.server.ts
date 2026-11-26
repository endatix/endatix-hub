import "server-only";
import { z } from "zod";
import { TelemetryLogger } from "@/features/telemetry";
import type { EndatixApi } from "@/lib/endatix-api";
import { normalizePagedResponse, type NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { appendPagingQueryParams, buildEndpointWithQuery } from "@/lib/endatix-api/shared/query-params";
import type { IPagedRequest } from "@/lib/endatix-api/shared/types";
import { Result, toResult } from "@/lib/result";
import { documentsPath, options } from "./document-api.server";
import { publication, type DocumentKind, type Publication } from "./documents";

const historyPage = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalRecords: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  items: publication.array(),
}).refine(({ page, pageSize, totalPages, totalRecords, items }) => {
  const remaining = totalRecords - (page - 1) * pageSize;
  return totalPages === Math.ceil(totalRecords / pageSize)
    && page <= Math.max(1, totalPages)
    && (totalRecords === 0 || items.length > 0)
    && items.length <= Math.min(pageSize, remaining);
});

export function buildVersionHistoryEndpoint(kind: DocumentKind, paging: IPagedRequest) {
  const params = new URLSearchParams();
  appendPagingQueryParams(params, paging, {page: 1, pageSize: 10});
  return buildEndpointWithQuery(`${documentsPath}/${kind}/versions`, params);
}

export async function readVersions(api: EndatixApi, kind: DocumentKind, paging: IPagedRequest) {
  const response = await api.get<unknown>(buildVersionHistoryEndpoint(kind, paging));
  const result = toResult(response, options);
  if (Result.isError(result) && !response.success) return result;
  if (Result.isSuccess(result)) {
    const parsed = historyPage.safeParse(result.value);
    if (parsed.success) return Result.success(normalizePagedResponse(parsed.data));
  }
  TelemetryLogger.warn("Unexpected legal version history format.", { kind }, options.loggerName);
  return Result.error<NormalizedPagedResponse<Publication>>("Could not read the document version history.");
}
