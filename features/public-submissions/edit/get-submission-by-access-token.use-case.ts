import { ApiResult, EndatixApi, Submission } from "@/lib/endatix-api";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result } from "@/lib/result";

export type GetSubmissionByAccessTokenQuery = {
  formId: string;
  token: string;
};

export type SubmissionByAccessTokenResult = Result<Submission>;

export const getSubmissionByAccessTokenUseCase = async ({
  formId,
  token,
}: GetSubmissionByAccessTokenQuery): Promise<SubmissionByAccessTokenResult> => {
  try {
    const endatixApi = new EndatixApi();
    const apiResult = await endatixApi.submissions.public.getByAccessToken(
      formId,
      token,
    );

    if (ApiResult.isSuccess(apiResult)) {
      return Result.success(apiResult.data);
    }

    return Result.error(
      apiResult.error?.message || "Failed to load submission",
      undefined,
      apiResult.error?.errorCode,
    );
  } catch (error) {
    const errorMessage = `Failed to load submission: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return Result.error(errorMessage, undefined, ERROR_CODE.UNKNOWN_ERROR);
  }
};
