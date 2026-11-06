import { authorization, Permissions } from "@/features/auth/authorization";
import type { SessionData } from "@/features/auth";
import {
  NO_SUBMISSION_EXPORT_ACCESS,
  submissionExportAccess,
  type SubmissionExportAccess,
} from "@/features/export";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
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
  DEFAULT_SUBMISSION_VIEW_SETTINGS,
  readViewSettings,
  type SubmissionGridViewLoad,
} from "./submission-grid-view";
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

export async function loadSubmissionGridView(
  formId: string,
  session: SessionData | undefined,
): Promise<SubmissionGridViewLoad> {
  const api = new EndatixApi(session);
  const result = toResult(await api.reporting.submissionViews.get(formId), {
    fallbackMessage: "Unable to load the submissions view.",
    logMessage: "Failed to load submission grid view.",
    loggerName: LOGGER_NAME,
  });
  if (Result.isError(result)) {
    return { version: null, settings: DEFAULT_SUBMISSION_VIEW_SETTINGS };
  }

  return {
    version: result.value.version,
    settings: readViewSettings(result.value.settings),
  };
}

export async function canEditSubmissionGrid(): Promise<boolean> {
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

/** Export, Prepare and Rebuild on the submissions page, in one check; a failed check allows nothing. */
export async function loadSubmissionExportAccess(): Promise<SubmissionExportAccess> {
  const { evaluatePermissions } = await authorization();
  const { Forms, Submissions } = Permissions;
  const result = await evaluatePermissions([Submissions.Export, Forms.Edit]);
  if (!result.success) return NO_SUBMISSION_EXPORT_ACCESS;
  return submissionExportAccess({
    submissionsExport: result.data[Submissions.Export],
    formsEdit: result.data[Forms.Edit],
  });
}
