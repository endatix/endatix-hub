import { serializeSubmissionListSearchParams } from "./serialize-submission-list-search-params";
import type { SubmissionListUrlState } from "./types";

export function buildSubmissionListPath(
  formId: string,
  state: SubmissionListUrlState,
): string {
  const queryString = serializeSubmissionListSearchParams(state).toString();
  return queryString
    ? `/forms/${formId}/submissions?${queryString}`
    : `/forms/${formId}/submissions`;
}
