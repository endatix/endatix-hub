import { postSubmissionOperation } from "./submit-public-form";
import type { SubmissionOperationResult } from "./submit-form-operation";

/**
 * Tells the hub that the respondent opened the form (POST /submissions/open), so the
 * submission's time starts now. Called from the browser once the survey shows: a link preview
 * that never runs scripts creates nothing.
 * @param formId - The ID of the form.
 * @param urlToken - The URL or personal link token the page was opened with.
 * @returns The opened submission.
 */
export function openPublicForm(
  formId: string,
  urlToken?: string,
): Promise<SubmissionOperationResult> {
  return postSubmissionOperation(
    `/api/public/v0/forms/${encodeURIComponent(formId)}/submissions/open`,
    { urlToken },
    {
      network: "Network error while opening the form.",
      parse: "Failed to parse the open response.",
    },
  );
}
