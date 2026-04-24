import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { IPagedRequest } from "../shared/types";
import {
  DataListSummary,
} from "./types";

export class DataLists {
  constructor(private readonly endatix: EndatixApi) {}

  async list(request?: IPagedRequest): Promise<ApiResult<DataListSummary[]>> {
    const page = request?.page ?? 1;
    const pageSize = request?.pageSize ?? 200;
    
    return this.endatix.get<DataListSummary[]>(
      `/data-lists?page=${page}&pageSize=${pageSize}`,
    );
  }
}
