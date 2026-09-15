import { EndatixApi, Submission } from "@/lib/endatix-api";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result, toResult } from "@/lib/result";

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
    return toResult(
      await endatixApi.submissions.public.getByAccessToken(formId, token),
      {
        fallbackMessage: "Failed to load submission",
        logMessage: "Failed to load submission by access token",
        loggerName: "public-submissions.getByAccessToken",
      },
    );
  } catch (error) {
    const errorMessage = `Failed to load submission: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    return Result.error(errorMessage, undefined, ERROR_CODE.UNKNOWN_ERROR);
  }
};
