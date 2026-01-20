import { EndatixApi, ApiResult } from "@/lib/endatix-api";
import { SubmissionData } from "@/features/submissions/types";

export const editSubmissionByAccessTokenUseCase = async (
  formId: string,
  token: string,
  submissionData: SubmissionData,
) => {
  const endatixApi = new EndatixApi();
  const result = await endatixApi.submissions.public.updateByAccessToken(
    formId,
    token,
    submissionData,
  );

  if (ApiResult.isSuccess(result)) {
    return result.data;
  } else {
    throw new Error(result.error?.message || "Failed to update submission");
  }
};
