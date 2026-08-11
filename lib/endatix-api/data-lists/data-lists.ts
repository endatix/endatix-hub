import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import {
  normalizePagedResponse,
  NormalizedPagedResponse,
} from "../shared/paged-response";
import { IPagedRequest, PagedResponse } from "../shared/types";
import {
  CreateDataListRequest,
  DataList,
  DataListChoiceItem,
  DataListDetails,
  DataListExportFormat,
  DataListExportResult,
  FormDependencySummary,
  ImportDataListRequest,
} from "./types";

export type DataListsPage = NormalizedPagedResponse<DataList>;

const DATA_LISTS_BASE = "/data-lists";
const DATA_LIST_ID_PARAM = "dataListId";
const CONTENT_DISPOSITION_FILENAME = /filename=\"?([^\";]+)\"?/i;

function dataListCollectionPath(query?: string): string {
  return query ? `${DATA_LISTS_BASE}?${query}` : DATA_LISTS_BASE;
}

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

function parseContentDispositionFileName(
  disposition: string,
): string | undefined {
  return CONTENT_DISPOSITION_FILENAME.exec(disposition)?.[1];
}

function defaultExportFileName(
  dataListId: string,
  format: DataListExportFormat,
): string {
  if (format === "json") {
    return `data-list-${dataListId}.json`;
  }

  return `data-list-${dataListId}-translations.csv`;
}

export class DataLists {
  constructor(private readonly endatix: EndatixApi) {}

  async list(request?: IPagedRequest): Promise<ApiResult<DataListsPage>> {
    const page = request?.page ?? 1;
    const pageSize = request?.pageSize ?? 20;
    const response = await this.endatix.get<PagedResponse<DataList>>(
      dataListCollectionPath(`page=${page}&pageSize=${pageSize}`),
    );

    if (!response.success) {
      return response;
    }

    return ApiResult.success(normalizePagedResponse(response.data));
  }

  async getById(dataListId: string): Promise<ApiResult<DataListDetails>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    return this.endatix.get<DataListDetails>(dataListPath(idResult.data));
  }

  async create(
    request: CreateDataListRequest,
  ): Promise<ApiResult<DataListDetails>> {
    return this.endatix.post<DataListDetails>(DATA_LISTS_BASE, request);
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
  ): Promise<ApiResult<DataListExportResult>> {
    const idResult = this.requireDataListId(dataListId);
    if (!idResult.success) {
      return idResult;
    }

    const response = await this.endatix.postStream(
      dataListPath(idResult.data, "export"),
      { format },
    );
    if (!response.success) {
      return response;
    }

    const body = await response.data.text();
    const contentType = response.data.headers.get("Content-Type") ?? "";
    const disposition = response.data.headers.get("Content-Disposition") ?? "";
    const fileName =
      parseContentDispositionFileName(disposition) ??
      defaultExportFileName(idResult.data, format);

    return ApiResult.success({ body, fileName, contentType });
  }

  async downloadTranslationsCsv(
    dataListId: string,
  ): Promise<ApiResult<{ csv: string; fileName: string }>> {
    const response = await this.export(dataListId, "csv");
    if (!response.success) {
      return response;
    }

    return ApiResult.success({
      csv: response.data.body,
      fileName: response.data.fileName,
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
