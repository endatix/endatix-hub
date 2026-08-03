import type { SubmissionData } from "@/features/submissions/types";
import { ApiResult } from "@/lib/endatix-api";
import { mapResponseToApiError } from "@/lib/endatix-api/shared/http-error-mapper";
import { withBasePath } from "@/lib/hosting";
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
  const endpoint = withBasePath(
    `/api/public/v0/forms/${encodeURIComponent(formId)}/submissions`,
  );
  const method = "POST";
  const details = { endpoint, method };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionData,
        urlToken,
      }),
    });
  } catch (error) {
    return ApiResult.networkError("Network error while submitting form.", {
      ...details,
      details: error instanceof Error ? error.message : String(error),
    });
  }

  if (response.ok) {
    let data: SubmissionOperation;
    try {
      data = (await response.json()) as SubmissionOperation;
    } catch (error) {
      return ApiResult.jsonParseError("Failed to parse submission response.", {
        ...details,
        statusCode: response.status,
        details: error instanceof Error ? error.message : String(error),
      });
    }

    return ApiResult.success(data);
  }

  return mapResponseToApiError<SubmissionOperation>(response, {
    ...details,
    statusCode: response.status,
  });
}
