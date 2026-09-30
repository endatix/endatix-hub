import { getSubmission } from "@/services/api";
import { Result } from "@/lib/result";
import { Submission } from "@/lib/endatix-api";

export type GetSubmissionDetailsQuery = {
  formId: string;
  submissionId: string;
};

export type SubmissionDetailsResult = Result<Submission>;

export const getSubmissionDetailsUseCase = async ({
  formId,
  submissionId,
}: GetSubmissionDetailsQuery): Promise<SubmissionDetailsResult> => {
  try {
    const response: Submission = await getSubmission(formId, submissionId);
    return Result.success(response);
  } catch (error) {
    const errorMessage = `Failed to load submission details: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    const status =
      error instanceof Error && "status" in error
        ? (error as Error & { status?: number }).status
        : undefined;
    // A missing submission is the not-found page, including right after delete.
    // console.error here becomes a Next.js dev overlay.
    if (status !== 404) {
      console.error(errorMessage);
    }

    return Result.error(errorMessage);
  }
};
