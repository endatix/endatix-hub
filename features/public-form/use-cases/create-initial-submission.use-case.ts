import { ApiResult, SubmissionData } from "@/lib/endatix-api";
import { cookies } from "next/headers";
import {
  SubmissionOperation,
  submitFormOperation,
} from "../application/submit-form-operation";
import { FormTokenCookieStore } from "../infrastructure/cookie-store";

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
  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);
  const initialSubmissionResult = await submitFormOperation(
    formId,
    submissionData,
    tokenStore,
  );

  return initialSubmissionResult;
};
