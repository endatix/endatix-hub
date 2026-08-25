import type { FormTemplate } from "@/types";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { CreateFormTemplateRequest } from "@/lib/form-types";
import type { PagedResponse } from "../shared/types";

export type FormTemplatesListRequest = {
  folderId?: string;
  filter?: string;
  sortBy?: "name" | "createdAt" | "modifiedAt";
  sortDir?: "asc" | "desc";
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
};

export type PartialUpdateFormTemplateRequest = {
  name?: string;
  description?: string;
  jsonData?: string;
  folderId?: string | null;
  clearFolderId?: boolean;
};

export class FormTemplates {
  constructor(private readonly endatix: EndatixApi) {}

  async create(
    body: CreateFormTemplateRequest,
  ): Promise<ApiResult<FormTemplate>> {
    return this.endatix.post<FormTemplate>("/form-templates", body);
  }

  async list(
    request?: FormTemplatesListRequest,
  ): Promise<ApiResult<FormTemplate[]>> {
    const templates: FormTemplate[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "100");
      if (request?.filter) {
        params.set("filter", request.filter);
      }
      if (request?.folderId) {
        params.set("folderId", request.folderId);
      }
      if (request?.sortBy) {
        params.set("sortBy", request.sortBy);
      }
      if (request?.sortDir) {
        params.set("sortDir", request.sortDir);
      }
      if (request?.createdFrom) {
        params.set("createdFrom", request.createdFrom);
      }
      if (request?.createdTo) {
        params.set("createdTo", request.createdTo);
      }
      if (request?.modifiedFrom) {
        params.set("modifiedFrom", request.modifiedFrom);
      }
      if (request?.modifiedTo) {
        params.set("modifiedTo", request.modifiedTo);
      }

      const result = await this.endatix.get<PagedResponse<FormTemplate>>(
        `/form-templates?${params.toString()}`,
      );
      if (!ApiResult.isSuccess(result)) {
        return result;
      }

      templates.push(...(result.data.items ?? []));
      totalPages = Math.max(result.data.totalPages ?? 1, 1);
      page += 1;
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
