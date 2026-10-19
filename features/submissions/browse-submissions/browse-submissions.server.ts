import { authorization, Permissions } from "@/features/auth/authorization";
import type { SessionData } from "@/features/auth";
import { EndatixApi } from "@/lib/endatix-api";
import { toResult } from "@/lib/result";
import type { ListSubmissionGridRowsRequest } from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  isReportingNotPrepared,
  resolveSubmissionGridColumnsLoad,
  resolveSubmissionGridRowsLoad,
  withAnswerFiltersNotPrepared,
  type SubmissionGridColumnsLoad,
  type SubmissionGridRowsLoad,
} from "./resolve-submission-grid-load";
import {
  toSubmissionGridRowsRequest,
  type SubmissionGridUrlState,
} from "./submission-grid-url";
import {
  NO_SUBMISSION_TEST_ACCESS,
  submissionTestAccess,
  type SubmissionTestAccess,
} from "./submission-test-flag";

const LOGGER_NAME = "submissions.browse";

export async function loadSubmissionGridColumns(
  formId: string,
  session: SessionData | undefined,
): Promise<SubmissionGridColumnsLoad> {
  const api = new EndatixApi(session);
  const result = toResult(
    await api.reporting.submissionGrid.listColumns(formId),
    {
      fallbackMessage: "Unable to load submission columns. Please try again.",
      logMessage: "Failed to load submission grid columns.",
      loggerName: LOGGER_NAME,
    },
  );

  return resolveSubmissionGridColumnsLoad(result);
}

export type LoadSubmissionGridRowsInput = {
  formId: string;
  urlState: SubmissionGridUrlState;
  columnKeys: readonly string[];
  session: SessionData | undefined;
};

/**
 * One page of rows. When the form has no schema to filter answers by, the
 * page is read again without answer filters, so metadata filters still work.
 */
export async function loadSubmissionGridRows(
  input: LoadSubmissionGridRowsInput,
): Promise<SubmissionGridRowsLoad> {
  const { formId, urlState } = input;
  const request = toSubmissionGridRowsRequest(urlState, input.columnKeys);
  const result = await listGridRows(input, request);
  if (!request.answerFilters?.length || !isReportingNotPrepared(result)) {
    return resolveSubmissionGridRowsLoad(formId, urlState, result);
  }

  const unfiltered = await listGridRows(input, {
    ...request,
    answerFilters: [],
  });
  return withAnswerFiltersNotPrepared(
    resolveSubmissionGridRowsLoad(formId, urlState, unfiltered),
  );
}

async function listGridRows(
  { formId, session }: LoadSubmissionGridRowsInput,
  request: ListSubmissionGridRowsRequest,
) {
  const api = new EndatixApi(session);
  return toResult(
    await api.reporting.submissionGrid.listRows(formId, request),
    {
      fallbackMessage: "Unable to load submissions. Please try again.",
      logMessage: "Failed to load submission grid rows.",
      loggerName: LOGGER_NAME,
    },
  );
}

/**
 * Including in-progress submissions and choosing filterable columns need
 * `forms.edit`; a miss hides those controls.
 */
export async function canEditForm(): Promise<boolean> {
  const { checkPermission } = await authorization();
  const result = await checkPermission(Permissions.Forms.Edit);
  return result.success;
}

/** Marking and deleting test submissions; a miss hides those controls. */
export async function loadSubmissionTestAccess(): Promise<SubmissionTestAccess> {
  const { evaluatePermissions } = await authorization();
  const { Forms, Submissions } = Permissions;
  const result = await evaluatePermissions([Forms.Test, Submissions.Delete]);
  if (!result.success) return NO_SUBMISSION_TEST_ACCESS;
  return submissionTestAccess({
    formsTest: result.data[Forms.Test],
    submissionsDelete: result.data[Submissions.Delete],
  });
}
