import type { EndatixApi } from "../endatix-api";
import type { ApiResult } from "../shared/api-result";
import type {
  ExportMappingListItem,
  UpsertExportMappingRequestBody,
} from "./export-format-types";

export class ExportMappings {
  constructor(private readonly endatix: EndatixApi) {}

  async list(): Promise<ApiResult<ExportMappingListItem[]>> {
    return this.endatix.get<ExportMappingListItem[]>(
      "/settings/export-mappings",
    );
  }

  async upsert(
    request: UpsertExportMappingRequestBody,
  ): Promise<ApiResult<ExportMappingListItem>> {
    return this.endatix.put<ExportMappingListItem>(
      "/settings/export-mappings",
      request,
    );
  }
}
