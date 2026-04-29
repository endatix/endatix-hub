import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { IPagedRequest } from "../shared/types";
import {
  normalizePagedItemsResponse,
  NormalizedPagedResponse,
  PagedItemsEnvelope,
} from "../shared/paged-response";
import { DataListsPageResponse, DataListSummary } from "./types";

export type DataListsPage = NormalizedPagedResponse<DataListSummary>;

export class DataLists {
  constructor(private readonly endatix: EndatixApi) {}

  async list(request?: IPagedRequest): Promise<ApiResult<DataListsPage>> {
    const page = request?.page ?? 1;
    const pageSize = request?.pageSize ?? 200;

    const result = await this.endatix.get<DataListSummary[] | DataListsPageResponse>(
      `/data-lists?page=${page}&pageSize=${pageSize}`,
    );
    if (!result.success) {
      return result;
    }

    const responseData = result.data;
    if (Array.isArray(responseData)) {
      return ApiResult.success(
        normalizePagedItemsResponse({
          page,
          pageSize,
          items: responseData,
        }),
      );
    }

    return ApiResult.success(
      normalizePagedItemsResponse(
        responseData as PagedItemsEnvelope<DataListSummary>,
      ),
    );
  }

}
