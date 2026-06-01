import type { SubmissionData } from "@/features/submissions/types";
import { ApiResult } from "@/lib/endatix-api";
import { mapResponseToApiError } from "@/lib/endatix-api/shared/http-error-mapper";
import type {
  SubmissionOperation,
  SubmissionOperationResult,
} from "./submit-form-operation";

/**
 * Submits a public form by making a POST request to the hub's /submissions endpoint.
 * @param formId - The ID of the form.
 * @param submissionData - The submission data.
 * @param urlToken - The URL token.
 * @returns The submission operation result.
 */
export async function submitPublicForm(
  formId: string,
  submissionData: SubmissionData,
  urlToken?: string,
): Promise<SubmissionOperationResult> {
  const endpoint = `/api/public/v0/forms/${encodeURIComponent(formId)}/submissions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      submissionData,
      urlToken,
    }),
  });

  if (response.ok) {
    const data = (await response.json()) as SubmissionOperation;
    return ApiResult.success(data);
  }

  return mapResponseToApiError<SubmissionOperation>(response, {
    endpoint,
    method: "POST",
  });
}
