import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import {
  normalizePagedResponse,
  type NormalizedPagedResponse,
} from "../shared/paged-response";
import {
  appendPagingQueryParams,
  appendQueryParam,
  buildEndpointWithQuery,
} from "../shared/query-params";
import { appendSubmissionListFilters } from "../submissions/submission-list-query-params";
import { toSubmissionGridRow } from "./submission-grid-rows-from-submissions";
import type {
  ListSubmissionGridColumnsRequest,
  ListSubmissionGridRowsRequest,
  SubmissionGridColumnsResponse,
  SubmissionGridRow,
} from "./submission-grid-types";

/** One page of grid rows, normalized for UI (adds `hasNextPage`). */
export type SubmissionGridRowsPage = NormalizedPagedResponse<SubmissionGridRow>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

/** Builds `GET forms/{formId}/reporting/columns`. */
export function buildListSubmissionGridColumnsEndpoint(
  formId: string,
  request: ListSubmissionGridColumnsRequest = {},
): string {
  const searchParams = new URLSearchParams();
  appendQueryParam(searchParams, "locale", request.locale);

  return buildEndpointWithQuery(
    `/forms/${formId}/reporting/columns`,
    searchParams,
  );
}

/**
 * Builds `GET forms/{formId}/reporting/submissions`: the submissions list
 * query plus `columns=k1,k2`.
 */
export function buildListSubmissionGridRowsEndpoint(
  formId: string,
  request: ListSubmissionGridRowsRequest,
): string {
  const searchParams = new URLSearchParams();
  appendPagingQueryParams(searchParams, request, {
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  appendSubmissionListFilters(searchParams, request);
  appendQueryParam(searchParams, "columns", request.columns.join(","));

  return buildEndpointWithQuery(
    `/forms/${formId}/reporting/submissions`,
    searchParams,
  );
}

/** The submissions grid read from a form's prepared reporting data. */
export class SubmissionGrid {
  constructor(private readonly endatix: EndatixApi) {}

  /** The form's grid columns in schema order, with its preparation counts. */
  async listColumns(
    formId: string,
    request: ListSubmissionGridColumnsRequest = {},
  ): Promise<ApiResult<SubmissionGridColumnsResponse>> {
    const validFormId = validateEndatixId(formId, "formId");
    if (Result.isError(validFormId)) {
      return ApiResult.validationError(validFormId.message);
    }

    return this.endatix.get<SubmissionGridColumnsResponse>(
      buildListSubmissionGridColumnsEndpoint(validFormId.value, request),
    );
  }

  /** One page of rows with the answers for `request.columns`. */
  async listRows(
    formId: string,
    request: ListSubmissionGridRowsRequest,
  ): Promise<ApiResult<SubmissionGridRowsPage>> {
    const validFormId = validateEndatixId(formId, "formId");
    if (Result.isError(validFormId)) {
      return ApiResult.validationError(validFormId.message);
    }

    return this.listRowsFromSubmissions(validFormId.value, request);
  }

  /**
   * Stand-in until `GET forms/{formId}/reporting/submissions` ships: reads the
   * submissions list and picks the answers from raw `jsonData`. Replace the
   * body with a GET of {@link buildListSubmissionGridRowsEndpoint}.
   */
  private async listRowsFromSubmissions(
    formId: string,
    request: ListSubmissionGridRowsRequest,
  ): Promise<ApiResult<SubmissionGridRowsPage>> {
    const response = await this.endatix.submissions.list(formId, request);
    if (!ApiResult.isSuccess(response)) {
      return response;
    }

    const page = normalizePagedResponse(response.data);
    return ApiResult.success({
      ...page,
      items: page.items.map((item) =>
        toSubmissionGridRow(item, request.columns),
      ),
    });
  }
}
