import { ApiResult, EndatixApi, Submission } from "@/lib/endatix-api";
import { FormTokenCookieStore } from "../infrastructure/cookie-store";
import { Result } from "@/lib/result";

export type PartialSubmissionResult = ApiResult<Submission>;

export type GetPartialSubmissionQuery = {
  formId: string;
  tokenStore: FormTokenCookieStore;
};

export const getPartialSubmissionUseCase = async ({
  formId,
  tokenStore,
}: GetPartialSubmissionQuery): Promise<PartialSubmissionResult> => {
  if (!formId) {
    return ApiResult.validationError("Form ID is required");
  }

  if (!tokenStore) {
    return ApiResult.validationError("Token store is required");
  }

  const tokenResult = tokenStore.getToken(formId);
  if (Result.isError(tokenResult)) {
    return ApiResult.validationError(tokenResult.message);
  }

  const token = tokenResult.value;

  const endatixApi = new EndatixApi();
  // eslint-disable-next-line testing-library/no-await-sync-queries
  const submissionResult = await endatixApi.submissions.public.getByToken(
    formId,
    token,
  );

  return submissionResult;
};
