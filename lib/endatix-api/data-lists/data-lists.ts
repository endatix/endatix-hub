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
  DataListChoiceItem,
  DataListDetails,
  DataList,
  FormDependencySummary,
} from "./types";

export type DataListsPage = NormalizedPagedResponse<DataList>;

export class DataLists {
  constructor(private readonly endatix: EndatixApi) {}

  async list(request?: IPagedRequest): Promise<ApiResult<DataListsPage>> {
    const page = request?.page ?? 1;
    const pageSize = request?.pageSize ?? 20;

    const response = await this.endatix.get<PagedResponse<DataList>>(
      `/data-lists?page=${page}&pageSize=${pageSize}`,
    );

    if (!response.success) {
      return response;
    }

    const data: DataListsPage = normalizePagedResponse(response.data);

    return ApiResult.success(data);
  }

  async getById(dataListId: string): Promise<ApiResult<DataListDetails>> {
    const validationResult = validateEndatixId(dataListId, "dataListId");
    if (Result.isError(validationResult)) {
      return ApiResult.validationError(validationResult.message);
    }

    return this.endatix.get<DataListDetails>(
      `/data-lists/${validationResult.value}`,
    );
  }

  async create(
    request: CreateDataListRequest,
  ): Promise<ApiResult<DataListDetails>> {
    return this.endatix.post<DataListDetails>("/data-lists", request);
  }

  async replaceItems(
    dataListId: string,
    items: DataListChoiceItem[],
  ): Promise<ApiResult<DataListDetails>> {
    const validationResult = validateEndatixId(dataListId, "dataListId");
    if (Result.isError(validationResult)) {
      return ApiResult.validationError(validationResult.message);
    }

    return this.endatix.put<DataListDetails>(
      `/data-lists/${validationResult.value}/items`,
      { items },
    );
  }

  async listFormDependencies(
    dataListId: string,
  ): Promise<ApiResult<FormDependencySummary[]>> {
    const validationResult = validateEndatixId(dataListId, "dataListId");
    if (Result.isError(validationResult)) {
      return ApiResult.validationError(validationResult.message);
    }

    return this.endatix.get<FormDependencySummary[]>(
      `/data-lists/${validationResult.value}/forms`,
    );
  }

  async delete(dataListId: string): Promise<ApiResult<string>> {
    const validationResult = validateEndatixId(dataListId, "dataListId");
    if (Result.isError(validationResult)) {
      return ApiResult.validationError(validationResult.message);
    }

    return this.endatix.delete<string>(`/data-lists/${validationResult.value}`);
  }
}
