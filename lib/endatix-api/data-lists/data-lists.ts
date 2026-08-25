import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import {
  normalizePagedResponse,
  NormalizedPagedResponse,
} from "../shared/paged-response";
import {
  appendPagingQueryParams,
  appendQueryParam,
  buildEndpointWithQuery,
} from "../shared/query-params";
import { PagedResponse } from "../shared/types";
import {
  CreateDataListRequest,
  DataList,
  DataListChoiceItem,
  DataListDetails,
  DataListExportFormat,
  DataListItem,
  FormDependencySummary,
  ImportDataListRequest,
  ListDataListItemsRequest,
  ListDataListsRequest,
  UpdateDataListDetailsRequest,
} from "./types";

export type DataListsPage = NormalizedPagedResponse<DataList>;
export type DataListItemsPage = NormalizedPagedResponse<DataListItem>;

const DATA_LISTS_BASE = "/data-lists";
const DATA_LIST_ID_PARAM = "dataListId";
const INCLUDE_LOCALES_QUERY_PARAM = "includeLocales";

function dataListPath(dataListId: string, ...segments: string[]): string {
  if (segments.length === 0) {
    return `${DATA_LISTS_BASE}/${dataListId}`;
  }

  return `${DATA_LISTS_BASE}/${dataListId}/${segments.join("/")}`;
}

function normalizeEnsureLocales(locales?: readonly string[]): string[] {
  return (locales ?? [])
    .map((locale) => locale.trim())
    .filter((locale) => locale.length > 0);
}

export function buildListDataListsEndpoint(
  request: ListDataListsRequest,
): string {
  const searchParams = new URLSearchParams();
  appendPagingQueryParams(searchParams, request, { page: 1, pageSize: 10 });
  appendQueryParam(searchParams, "search", request.search);
  appendQueryParam(searchParams, "hasLocale", request.hasLocale);
  appendQueryParam(searchParams, "sortBy", request.sortBy);
  appendQueryParam(searchParams, "sortDir", request.sortDir);
  appendQueryParam(searchParams, "createdFrom", request.createdFrom);
  appendQueryParam(searchParams, "createdTo", request.createdTo);
  appendQueryParam(searchParams, "modifiedFrom", request.modifiedFrom);
  appendQueryParam(searchParams, "modifiedTo", request.modifiedTo);
  return buildEndpointWithQuery(DATA_LISTS_BASE, searchParams);
}

export function buildListDataListItemsEndpoint(
  dataListId: string,
  request: ListDataListItemsRequest,
): string {
  const searchParams = new URLSearchParams();
  appendQueryParam(searchParams, "page", request.page ?? 1);
  appendQueryParam(searchParams, "pageSize", request.pageSize ?? 25);
  appendQueryParam(searchParams, "query", request.query);
  appendQueryParam(searchParams, "matchMode", request.matchMode);
  appendQueryParam(searchParams, "locale", request.locale);
  appendQueryParam(searchParams, "sortBy", request.sortBy);
  appendQueryParam(searchParams, "sortDir", request.sortDir);
  appendQueryParam(searchParams, "createdFrom", request.createdFrom);
  appendQueryParam(searchParams, "createdTo", request.createdTo);
  appendQueryParam(searchParams, "modifiedFrom", request.modifiedFrom);
  appendQueryParam(searchParams, "modifiedTo", request.modifiedTo);
  for (const locale of request.includeLocales ?? []) {
    appendQueryParam(searchParams, INCLUDE_LOCALES_QUERY_PARAM, locale);
  }

  return buildEndpointWithQuery(
    dataListPath(dataListId, "items"),
    searchParams,
  );
}

export class DataLists {
  constructor(private readonly endatix: EndatixApi) {}

  async list(
    request: ListDataListsRequest = {},
  ): Promise<ApiResult<DataListsPage>> {
    const response = await this.endatix.get<PagedResponse<DataList>>(
      buildListDataListsEndpoint(request),
    );

    if (!response.success) {
      return response;
    }

    return ApiResult.success(normalizePagedResponse(response.data));
  }

  async listLocales(): Promise<ApiResult<string[]>> {
    return this.endatix.get<string[]>(`${DATA_LISTS_BASE}/locales`);
  }

  async listItems(
    dataListId: string,
    request: ListDataListItemsRequest = {},
  ): Promise<ApiResult<DataListItemsPage>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    const response = await this.endatix.get<PagedResponse<DataListItem>>(
      buildListDataListItemsEndpoint(idResult.data, request),
    );

    if (!response.success) {
      return response;
    }

    return ApiResult.success(normalizePagedResponse(response.data));
  }

  async getById(
    dataListId: string,
    options?: { includeItems?: boolean },
  ): Promise<ApiResult<DataListDetails>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    const searchParams = new URLSearchParams();
    if (options?.includeItems === false) {
      appendQueryParam(searchParams, "includeItems", false);
    }

    return this.endatix.get<DataListDetails>(
      buildEndpointWithQuery(dataListPath(idResult.data), searchParams),
    );
  }

  async create(
    request: CreateDataListRequest,
  ): Promise<ApiResult<DataListDetails>> {
    return this.endatix.post<DataListDetails>(DATA_LISTS_BASE, request);
  }

  async updateDetails(
    dataListId: string,
    request: UpdateDataListDetailsRequest,
  ): Promise<ApiResult<DataListDetails>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    return this.endatix.patch<DataListDetails>(
      dataListPath(idResult.data),
      request,
    );
  }

  async import(
    dataListId: string,
    request: ImportDataListRequest,
  ): Promise<ApiResult<DataListDetails>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    return this.endatix.put<DataListDetails>(
      dataListPath(idResult.data, "import"),
      {
        format: request.format,
        items: request.items,
        csv: request.csv,
        ensureLocales: normalizeEnsureLocales(request.ensureLocales),
      },
    );
  }

  async replaceItems(
    dataListId: string,
    items: DataListChoiceItem[],
    options?: { ensureLocales?: string[] },
  ): Promise<ApiResult<DataListDetails>> {
    return this.import(dataListId, {
      format: "json",
      items,
      ensureLocales: options?.ensureLocales,
    });
  }

  async addLocale(
    dataListId: string,
    locale: string,
  ): Promise<ApiResult<DataListDetails>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    return this.endatix.post<DataListDetails>(
      dataListPath(idResult.data, "locales"),
      { locale },
    );
  }

  async removeLocale(
    dataListId: string,
    locale: string,
  ): Promise<ApiResult<DataListDetails>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    const encodedLocale = encodeURIComponent(locale.trim());
    return this.endatix.delete<DataListDetails>(
      dataListPath(idResult.data, "locales", encodedLocale),
    );
  }

  async setDefaultLocale(
    dataListId: string,
    defaultLocale: string,
  ): Promise<ApiResult<DataListDetails>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    return this.endatix.put<DataListDetails>(
      dataListPath(idResult.data, "default-locale"),
      { defaultLocale },
    );
  }

  async listFormDependencies(
    dataListId: string,
  ): Promise<ApiResult<FormDependencySummary[]>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    return this.endatix.get<FormDependencySummary[]>(
      dataListPath(idResult.data, "forms"),
    );
  }

  async delete(dataListId: string): Promise<ApiResult<string>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    return this.endatix.delete<string>(dataListPath(idResult.data));
  }

  async export(
    dataListId: string,
    format: DataListExportFormat = "csv",
  ): Promise<ApiResult<Response>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    return this.endatix.postStream(dataListPath(idResult.data, "export"), {
      format,
    });
  }

  async uploadTranslationsCsv(
    dataListId: string,
    csv: string,
    options?: { ensureLocales?: string[] },
  ): Promise<ApiResult<DataListDetails>> {
    return this.import(dataListId, {
      format: "csv",
      csv,
      ensureLocales: options?.ensureLocales,
    });
  }

  private requireDataListId(dataListId: string): ApiResult<string> {
    const validationResult = validateEndatixId(dataListId, DATA_LIST_ID_PARAM);
    if (Result.isError(validationResult)) {
      return ApiResult.validationError(validationResult.message);
    }

    return ApiResult.success(validationResult.value);
  }
}
