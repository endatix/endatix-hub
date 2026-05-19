import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import type { PublicFormAccessResponse } from "@/lib/endatix-api/forms/types";

export interface SubmissionIdResponse {
  id: string;
}

/** Endatix API calls used by form storage gate strategies (no Hub-side policy cache). */
export interface FormAccessProvider {
  getAnonymousFormDefinition(formId: string): Promise<ApiResult<unknown>>;
  getPublicFormAccess(
    formId: string,
    hubAccessToken: string,
  ): Promise<ApiResult<PublicFormAccessResponse>>;
  getSubmissionByAccessToken(
    formId: string,
    token: string,
  ): Promise<ApiResult<SubmissionIdResponse>>;
  getSubmissionByToken(
    formId: string,
    token: string,
  ): Promise<ApiResult<SubmissionIdResponse>>;
}

export function createFormAccessProvider(): FormAccessProvider {
  return {
    getAnonymousFormDefinition(formId) {
      return new EndatixApi().get<unknown>(`/forms/${formId}/definition`, {
        requireAuth: false,
      });
    },
    getPublicFormAccess(formId, hubAccessToken) {
      return new EndatixApi(hubAccessToken).forms.getPublicFormAccess(
        formId,
        {},
        true,
      );
    },
    getSubmissionByAccessToken(formId, token) {
      return new EndatixApi().submissions.public.getByAccessToken(
        formId,
        token,
      );
    },
    getSubmissionByToken(formId, token) {
      return new EndatixApi().submissions.public.getByToken(formId, token);
    },
  };
}
