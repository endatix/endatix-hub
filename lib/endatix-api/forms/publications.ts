import type { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type { FormPublication, StartPublicationRequest } from "./types";
import { versionedFormRequest } from "./versioned-form-request";

export class FormPublications {
  constructor(private readonly api: EndatixApi) {}

  async start(
    formId: string,
    version: string,
    body: StartPublicationRequest,
  ): Promise<ApiResult<FormPublication>> {
    const request = versionedFormRequest(formId, version);
    if (!request.success) return request;
    const { path, options } = request.data;
    return this.api.post(`${path}/publications`, body, options);
  }

  async get(
    formId: string,
    publicationId: string,
  ): Promise<ApiResult<FormPublication>> {
    const form = validateEndatixId(formId, "formId");
    if (Result.isError(form)) return ApiResult.validationError(form.message);
    const publication = validateEndatixId(publicationId, "publicationId");
    if (Result.isError(publication))
      return ApiResult.validationError(publication.message);
    return this.api.get(
      `/forms/${form.value}/publications/${publication.value}`,
    );
  }
}
