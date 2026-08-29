import type { SubmissionListUrlState } from "@/features/submissions/list-submission-query";
import { submissionListUrlStateToListRequest } from "@/features/submissions/list-submission-query";
import type { SessionData } from "@/features/auth";
import { EndatixApi } from "@/lib/endatix-api";
import { toResult } from "@/lib/result";
import { resolveSubmissionListPageLoad } from "./resolve-submission-list-page-load";
import type { SubmissionListPageLoad } from "./types";

export type LoadSubmissionListPageInput = {
  formId: string;
  listState: SubmissionListUrlState;
  sessionOrToken: SessionData | string | undefined;
  useReportingExport: boolean;
};

function hasActiveSubmissionListFilters(
  listState: SubmissionListUrlState,
): boolean {
  return (
    listState.isComplete.length > 0 ||
    listState.status.length > 0 ||
    listState.isTestSubmission.length > 0 ||
    Boolean(
      listState.createdFrom ||
        listState.createdTo ||
        listState.modifiedFrom ||
        listState.modifiedTo ||
        listState.startedFrom ||
        listState.startedTo ||
        listState.completedFrom ||
        listState.completedTo ||
        listState.submitterDisplayId ||
        listState.submitterEmail,
    )
  );
}

/**
 * Fetches submissions + definition fields, maps with `toResult`, and returns
 * a page-load outcome. Do not throw into `error.tsx` for known GET failures.
 */
export async function loadSubmissionListPage({
  formId,
  listState,
  sessionOrToken,
  useReportingExport,
}: LoadSubmissionListPageInput): Promise<SubmissionListPageLoad> {
  const api = new EndatixApi(sessionOrToken);
  const hasActiveFilters = hasActiveSubmissionListFilters(listState);
  const listRequest = submissionListUrlStateToListRequest(listState);

  const [submissionsApiResult, fieldsApiResult, probeResult] =
    await Promise.all([
      api.submissions.list(formId, listRequest),
      api.definitions.getFields(formId),
      hasActiveFilters
        ? api.submissions.list(formId, { pageSize: 1 })
        : Promise.resolve(null),
    ]);

  return resolveSubmissionListPageLoad({
    formId,
    listState,
    useReportingExport,
    hasActiveFilters,
    submissionsResult: toResult(submissionsApiResult, {
      fallbackMessage: "Unable to load submissions. Please try again.",
      logMessage: "Failed to load submissions list.",
      loggerName: "submissions.list",
    }),
    fieldsResult: toResult(fieldsApiResult, {
      fallbackMessage: "Unable to load submission fields. Please try again.",
      logMessage: "Failed to load submission definition fields.",
      loggerName: "submissions.fields",
    }),
    probeResult,
  });
}
