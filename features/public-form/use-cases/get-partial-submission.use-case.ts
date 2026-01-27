import { ApiResult, EndatixApi, Submission } from "@/lib/endatix-api";
import { FormTokenCookieStore } from "../infrastructure/cookie-store";
import { Result } from "@/lib/result";

export type PartialSubmissionResult = ApiResult<Submission>;

export type GetPartialSubmissionQuery = {
  formId: string;
  tokenStore: FormTokenCookieStore;
  urlToken?: string;
};

export const getPartialSubmissionUseCase = async ({
  formId,
  tokenStore,
  urlToken,
}: GetPartialSubmissionQuery): Promise<PartialSubmissionResult> => {
  if (!formId) {
    return ApiResult.validationError("Form ID is required");
  }

  if (!tokenStore) {
    return ApiResult.validationError("Token store is required");
  }

  // Use URL token if provided, otherwise get from cookie store
  let token: string;
  if (urlToken) {
    token = urlToken;
  } else {
    const tokenResult = tokenStore.getToken(formId);
    if (Result.isError(tokenResult)) {
      return ApiResult.validationError(tokenResult.message);
    }
    token = tokenResult.value;
  }

  const endatixApi = new EndatixApi();
  const submissionResult = await endatixApi.submissions.public.getByToken(
    formId,
    token,
  );

  return submissionResult;
};
