import type { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type {
  DraftAcknowledgement,
  DraftJournalBatch,
  FormDraft,
} from "./types";
import { versionedFormRequest } from "./versioned-form-request";

export class FormDrafts {
  constructor(private readonly api: EndatixApi) {}

  async get(formId: string): Promise<ApiResult<FormDraft>> {
    const id = validateEndatixId(formId, "formId");
    if (Result.isError(id)) return ApiResult.validationError(id.message);
    return this.api.get(`/forms/${id.value}/draft`);
  }

  async replace(
    formId: string,
    version: string,
    jsonData: string,
  ): Promise<ApiResult<FormDraft>> {
    const request = versionedFormRequest(formId, version);
    if (!request.success) return request;
    const { path, options } = request.data;
    return this.api.put(`${path}/draft`, { jsonData }, options);
  }

  async append(
    formId: string,
    version: string,
    batch: DraftJournalBatch,
  ): Promise<ApiResult<DraftAcknowledgement>> {
    const request = versionedFormRequest(formId, version);
    if (!request.success) return request;
    const { path, options } = request.data;
    return this.api.patch(`${path}/draft`, batch, options);
  }

  async discard(
    formId: string,
    version: string,
  ): Promise<ApiResult<FormDraft>> {
    const request = versionedFormRequest(formId, version);
    if (!request.success) return request;
    const { path, options } = request.data;
    return this.api.delete(`${path}/draft`, options);
  }
}
