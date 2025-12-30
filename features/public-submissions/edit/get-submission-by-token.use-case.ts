import { EndatixApi, ApiResult, Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";

export type GetSubmissionByTokenQuery = {
  formId: string;
  token: string;
};

export type SubmissionByTokenResult = Result<Submission>;

export const getSubmissionByTokenUseCase = async ({
  formId,
  token,
}: GetSubmissionByTokenQuery): Promise<SubmissionByTokenResult> => {
  try {
    const endatixApi = new EndatixApi();
    const apiResult = await endatixApi.submissions.public.getByToken(
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
