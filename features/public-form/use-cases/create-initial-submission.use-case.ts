import { ApiResult, Submission, SubmissionData } from "@/lib/endatix-api";
import {
  SubmissionOperation,
  submitFormAction,
} from "../application/actions/submit-form.action";

export const createInitialSubmissionUseCase = async (
  formId: string,
  formLang: string | null,
  reasonCreated: string,
): Promise<ApiResult<SubmissionOperation>> => {
  if (!formId) {
    return ApiResult.validationError("Form ID is required");
  }

  if (!reasonCreated) {
    return ApiResult.validationError("Reason created is required");
  }

  const submissionData: SubmissionData = {
    isComplete: false,
    jsonData: JSON.stringify({}),
    metadata: JSON.stringify({
      reasonCreated: reasonCreated,
      ...(formLang ? { language: formLang } : {}),
    }),
  };
  const initialSubmissionResult = await submitFormAction(
    formId,
    submissionData,
  );

  return initialSubmissionResult;
};
