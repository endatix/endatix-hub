import type { FormTemplate } from "@/types";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { CreateFormTemplateRequest } from "@/lib/form-types";
import { appendDateRangeFilters, appendSortParams } from "../shared/list-query";
import { normalizePagedResponse } from "../shared/paged-response";
import {
  appendPagingQueryParams,
  appendQueryParam,
  buildEndpointWithQuery,
} from "../shared/query-params";
import type {
  AuditDateFilters,
  IPagedRequest,
  PagedResponse,
  SortRequest,
} from "../shared/types";

export type FormTemplateListSortBy = "name" | "createdAt" | "modifiedAt";

export type FormTemplatesListRequest = {
  folderId?: string;
  filter?: string;
  unassignedOnly?: boolean;
} & IPagedRequest &
  SortRequest<FormTemplateListSortBy> &
  AuditDateFilters;

export type PartialUpdateFormTemplateRequest = {
  name?: string;
  description?: string;
  jsonData?: string;
  folderId?: string | null;
  clearFolderId?: boolean;
};

const DEFAULT_LIST_PAGE_SIZE = 100;
/** Hard stop so a server that misreports `totalPages` cannot loop forever. */
const LIST_ALL_MAX_PAGES = 50;

export class FormTemplates {
  constructor(private readonly endatix: EndatixApi) {}

  async create(
    body: CreateFormTemplateRequest,
  ): Promise<ApiResult<FormTemplate>> {
    return this.endatix.post<FormTemplate>("/form-templates", body);
  }

  /**
   * Drains every page into a flat array (template pickers have no paging control).
   * Mirrors `Themes.listAll` - see `lib/endatix-api/themes/themes.ts`, the reference
   * implementation for paged list clients.
   */
  async list(
    request: Omit<FormTemplatesListRequest, "page"> = {},
  ): Promise<ApiResult<FormTemplate[]>> {
    const templates: FormTemplate[] = [];
    const pageSize = request.pageSize ?? DEFAULT_LIST_PAGE_SIZE;
    let hasNextPage = false;

    for (let page = 1; page <= LIST_ALL_MAX_PAGES; page++) {
      const result = await this.endatix.get<PagedResponse<FormTemplate>>(
        buildListFormTemplatesEndpoint({ ...request, page, pageSize }),
      );
      if (!ApiResult.isSuccess(result)) {
        return result;
      }

      const paged = normalizePagedResponse(result.data);
      templates.push(...paged.items);
      hasNextPage = paged.hasNextPage;
      if (!hasNextPage) {
        break;
      }
    }

    if (hasNextPage) {
      return ApiResult.serverError(
        `Could not load all form templates (stopped after ${LIST_ALL_MAX_PAGES} pages)`,
      );
    }

    return ApiResult.success(templates);
  }

  async partialUpdate(
    templateId: string,
    body: PartialUpdateFormTemplateRequest,
  ): Promise<ApiResult<void>> {
    const idResult = validateEndatixId(templateId, "templateId");
    if (Result.isError(idResult)) {
      return ApiResult.validationError(idResult.message);
    }
    return this.endatix.patch<void>(`/form-templates/${idResult.value}`, body);
  }
}

export function buildListFormTemplatesEndpoint(
  request: FormTemplatesListRequest,
): string {
  const searchParams = new URLSearchParams();
  appendPagingQueryParams(searchParams, request, {
    page: 1,
    pageSize: DEFAULT_LIST_PAGE_SIZE,
  });
  appendQueryParam(searchParams, "folderId", request.folderId);
  appendSortParams(searchParams, request);
  appendDateRangeFilters(searchParams, request, ["created", "modified"]);

  if (request.unassignedOnly) {
    appendQueryParam(searchParams, "filter", "folderId:null");
  } else if (request.filter) {
    appendQueryParam(searchParams, "filter", request.filter);
  }

  return buildEndpointWithQuery("/form-templates", searchParams);
}
