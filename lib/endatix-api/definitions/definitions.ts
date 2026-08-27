import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { appendDateRangeFilters, appendSortParams } from "../shared/list-query";
import {
  normalizePagedResponse,
  type NormalizedPagedResponse,
} from "../shared/paged-response";
import {
  appendPagingQueryParams,
  buildEndpointWithQuery,
} from "../shared/query-params";
import type {
  AuditDateFilters,
  IPagedRequest,
  PagedResponse,
  SortRequest,
} from "../shared/types";
import type {
  DefinitionField,
  FormDefinitionDto,
  FormDefinitionListSortBy,
} from "./types";

/**
 * `GET /forms/{formId}/definitions` request: paging + sort + created/modified bounds.
 */
export type DefinitionsListRequest = IPagedRequest &
  SortRequest<FormDefinitionListSortBy> &
  AuditDateFilters;

export type DefinitionsPage = NormalizedPagedResponse<FormDefinitionDto>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function buildListDefinitionsEndpoint(
  formId: string,
  request: DefinitionsListRequest = {},
): string {
  const searchParams = new URLSearchParams();
  appendPagingQueryParams(searchParams, request, {
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  appendSortParams(searchParams, request);
  appendDateRangeFilters(searchParams, request, ["created", "modified"]);

  return buildEndpointWithQuery(`/forms/${formId}/definitions`, searchParams);
}

export class Definitions {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Returns the union of single-value fields across all definitions for a form.
   */
  async getFields(formId: string): Promise<ApiResult<DefinitionField[]>> {
    const validateResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }

    return this.endatix.get<DefinitionField[]>(
      `/forms/${validateResult.value}/definition/fields`,
    );
  }

  /**
   * Lists one page of definitions for a form. Empty form is 404 on the API.
   */
  async list(
    formId: string,
    request: DefinitionsListRequest = {},
  ): Promise<ApiResult<DefinitionsPage>> {
    const formIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(formIdResult)) {
      return ApiResult.validationError(formIdResult.message);
    }

    const response = await this.endatix.get<PagedResponse<FormDefinitionDto>>(
      buildListDefinitionsEndpoint(formIdResult.value, request),
    );
    if (!ApiResult.isSuccess(response)) {
      return response;
    }

    return ApiResult.success(normalizePagedResponse(response.data));
  }

  async get(
    formId: string,
    definitionId: string,
  ): Promise<ApiResult<FormDefinitionDto>> {
    const formIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(formIdResult)) {
      return ApiResult.validationError(formIdResult.message);
    }

    const definitionIdResult = validateEndatixId(definitionId, "definitionId");
    if (Result.isError(definitionIdResult)) {
      return ApiResult.validationError(definitionIdResult.message);
    }

    return this.endatix.get<FormDefinitionDto>(
      `/forms/${formIdResult.value}/definitions/${definitionIdResult.value}`,
    );
  }
}
