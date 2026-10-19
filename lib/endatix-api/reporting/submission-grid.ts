import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult, isNotFoundError } from "../shared/api-result";
import {
  normalizePagedResponse,
  type NormalizedPagedResponse,
} from "../shared/paged-response";
import {
  appendPagingQueryParams,
  appendQueryParam,
  buildEndpointWithQuery,
} from "../shared/query-params";
import type { PagedResponse } from "../shared/types";
import { appendSubmissionListFilters } from "../submissions/submission-list-query-params";
import { toSubmissionGridRow } from "./submission-grid-rows-from-submissions";
import type {
  ListSubmissionGridColumnsRequest,
  ListSubmissionGridRowsRequest,
  SubmissionGridAnswerFilter,
  SubmissionGridAnswerFilterCoverage,
  SubmissionGridColumnsResponse,
  SubmissionGridRow,
  SubmissionGridSearchKeysResponse,
} from "./submission-grid-types";

/** One page of grid rows, normalized for UI (adds `hasNextPage`). */
export type SubmissionGridRowsPage =
  NormalizedPagedResponse<SubmissionGridRow> & {
    answerFilterCoverage?: SubmissionGridAnswerFilterCoverage;
  };

type SubmissionGridRowsResponse = PagedResponse<SubmissionGridRow> & {
  answerFilterCoverage?: SubmissionGridAnswerFilterCoverage;
};

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
 * Builds `forms/{formId}/reporting/search-keys`. A column key can hold `/`,
 * so a key to remove goes in the query, not the path.
 */
export function buildSearchKeysEndpoint(formId: string, key?: string): string {
  const searchParams = new URLSearchParams();
  appendQueryParam(searchParams, "key", key);

  return buildEndpointWithQuery(
    `/forms/${formId}/reporting/search-keys`,
    searchParams,
  );
}

/**
 * Builds `GET forms/{formId}/reporting/submissions`: the submissions list
 * query plus `columns=k1,k2` and one `answer=` per answer filter.
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
  request.answerFilters?.forEach((filter) =>
    searchParams.append("answer", toAnswerParam(filter)),
  );

  return buildEndpointWithQuery(
    `/forms/${formId}/reporting/submissions`,
    searchParams,
  );
}

/**
 * `{operator}:{key}:{value}`. A schema key can hold `:`, so the key is
 * percent-encoded; the value is everything after the second `:`.
 */
function toAnswerParam({ operator, key, value }: SubmissionGridAnswerFilter) {
  return `${operator}:${encodeURIComponent(key)}:${value}`;
}

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

  /**
   * Makes a column filterable in a slot kept for people. The key comes back
   * `pending` while the form's search copy is rebuilt in the background.
   */
  async addSearchKey(
    formId: string,
    key: string,
  ): Promise<ApiResult<SubmissionGridSearchKeysResponse>> {
    const target = validateSearchKeyTarget(formId, key);
    return ApiResult.isSuccess(target)
      ? this.endatix.post<SubmissionGridSearchKeysResponse>(
          buildSearchKeysEndpoint(target.data.formId),
          { key: target.data.key },
        )
      : target;
  }

  /** Stops a key a person added from being filterable; automatic keys stay. */
  async removeSearchKey(
    formId: string,
    key: string,
  ): Promise<ApiResult<SubmissionGridSearchKeysResponse>> {
    const target = validateSearchKeyTarget(formId, key);
    return ApiResult.isSuccess(target)
      ? this.endatix.delete<SubmissionGridSearchKeysResponse>(
          buildSearchKeysEndpoint(target.data.formId, target.data.key),
        )
      : target;
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

    const response = await this.getRows(validFormId.value, request);
    return isNotFoundError(response) && !request.answerFilters?.length
      ? this.listRowsFromSubmissions(validFormId.value, request)
      : response;
  }

  private async getRows(
    formId: string,
    request: ListSubmissionGridRowsRequest,
  ): Promise<ApiResult<SubmissionGridRowsPage>> {
    const response = await this.endatix.get<SubmissionGridRowsResponse>(
      buildListSubmissionGridRowsEndpoint(formId, request),
    );
    if (!ApiResult.isSuccess(response)) {
      return response;
    }

    const { answerFilterCoverage } = response.data;
    return ApiResult.success({
      ...normalizePagedResponse(response.data),
      ...(answerFilterCoverage && { answerFilterCoverage }),
    });
  }

  /**
   * For an API that has the columns endpoint but not the rows endpoint yet
   * (404): reads the submissions list and picks the answers from raw
   * `jsonData`, the way the rows endpoint does for rows not prepared. The
   * list cannot filter answers, so answer filters never fall back here.
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

function validateSearchKeyTarget(
  formId: string,
  key: string,
): ApiResult<{ formId: string; key: string }> {
  const validFormId = validateEndatixId(formId, "formId");
  if (Result.isError(validFormId)) {
    return ApiResult.validationError(validFormId.message);
  }

  return key.trim()
    ? ApiResult.success({ formId: validFormId.value, key })
    : ApiResult.validationError("A column key is required.");
}
