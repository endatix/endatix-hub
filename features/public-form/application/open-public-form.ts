import { ApiResult } from "@/lib/endatix-api";
import { mapResponseToApiError } from "@/lib/endatix-api/shared/http-error-mapper";
import { withBasePath } from "@/lib/hosting";
import type {
  SubmissionOperation,
  SubmissionOperationResult,
} from "./submit-form-operation";

/**
 * Tells the hub that the respondent opened the form (POST /submissions/open), so the
 * submission's time starts now. Called from the browser once the survey shows: a link preview
 * that never runs scripts creates nothing.
 * @param formId - The ID of the form.
 * @param urlToken - The URL or personal link token the page was opened with.
 * @returns The opened submission.
 */
export async function openPublicForm(
  formId: string,
  urlToken?: string,
): Promise<SubmissionOperationResult> {
  const endpoint = withBasePath(
    `/api/public/v0/forms/${encodeURIComponent(formId)}/submissions/open`,
  );
  const details = { endpoint, method: "POST" };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urlToken }),
    });
  } catch (error) {
    return ApiResult.networkError("Network error while opening the form.", {
      ...details,
      details: error instanceof Error ? error.message : String(error),
    });
  }

  if (!response.ok) {
    return mapResponseToApiError<SubmissionOperation>(response, {
      ...details,
      statusCode: response.status,
    });
  }

  try {
    return ApiResult.success((await response.json()) as SubmissionOperation);
  } catch (error) {
    return ApiResult.jsonParseError("Failed to parse the open response.", {
      ...details,
      statusCode: response.status,
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
