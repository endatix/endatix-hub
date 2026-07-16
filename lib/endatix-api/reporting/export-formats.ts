import type { EndatixApi } from "../endatix-api";
import type { ApiResult } from "../shared/api-result";
import {
  normalizeExportFormat,
  normalizeExportFormats,
} from "./normalize-export-formats";
import type {
  CreateExportFormatRequestBody,
  ExportFormatListItem,
  UpdateExportFormatRequestBody,
} from "./export-format-types";

export class ExportFormats {
  constructor(private readonly endatix: EndatixApi) {}

  async list(): Promise<ApiResult<ExportFormatListItem[]>> {
    const result = await this.endatix.get<ExportFormatListItem[]>(
      "/settings/export-formats",
    );

    if (!result.success || !result.data) {
      return result;
    }

    return {
      ...result,
      data: normalizeExportFormats(result.data),
    };
  }

  async create(
    request: CreateExportFormatRequestBody,
  ): Promise<ApiResult<ExportFormatListItem>> {
    const result = await this.endatix.post<ExportFormatListItem>(
      "/settings/export-formats",
      request,
    );

    if (!result.success || !result.data) {
      return result;
    }

    return {
      ...result,
      data: normalizeExportFormat(result.data),
    };
  }

  async update(
    exportFormatId: string,
    request: UpdateExportFormatRequestBody,
  ): Promise<ApiResult<ExportFormatListItem>> {
    const result = await this.endatix.patch<ExportFormatListItem>(
      `/settings/export-formats/${encodeURIComponent(exportFormatId)}`,
      request,
    );

    if (!result.success || !result.data) {
      return result;
    }

    return {
      ...result,
      data: normalizeExportFormat(result.data),
    };
  }

  async delete(exportFormatId: string): Promise<ApiResult<string>> {
    return this.endatix.delete<string>(
      `/settings/export-formats/${encodeURIComponent(exportFormatId)}`,
    );
  }
}
