import type { FormTemplate } from "@/types";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { CreateFormTemplateRequest } from "@/lib/form-types";

export type FormTemplatesListRequest = {
  folderId?: string;
  filter?: string;
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
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    if (request?.filter) {
      params.set("filter", request.filter);
    }
    if (request?.folderId) {
      params.set("folderId", request.folderId);
    }
    return this.endatix.get<FormTemplate[]>(
      `/form-templates?${params.toString()}`,
    );
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
