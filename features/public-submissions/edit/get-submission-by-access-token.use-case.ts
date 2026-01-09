import { ApiResult, EndatixApi, Submission } from "@/lib/endatix-api";
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
    } else {
      return Result.error(
        apiResult.error?.message || "Failed to load submission",
      );
    }
  } catch (error) {
    const errorMessage = `Failed to load submission: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    return Result.error(errorMessage);
  }
};
