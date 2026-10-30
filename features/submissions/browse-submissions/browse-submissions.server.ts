import { authorization, Permissions } from "@/features/auth/authorization";
import type { SessionData } from "@/features/auth";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import {
  resolveSubmissionGridColumnsLoad,
  resolveSubmissionGridRowsLoad,
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

export async function loadSubmissionGridRows({
  formId,
  urlState,
  columnKeys,
  session,
}: LoadSubmissionGridRowsInput): Promise<SubmissionGridRowsLoad> {
  const api = new EndatixApi(session);
  const request = toSubmissionGridRowsRequest(urlState, columnKeys);
  const result = toResult(
    await api.reporting.submissionGrid.listRows(formId, request),
    {
      fallbackMessage: "Unable to load submissions. Please try again.",
      logMessage: "Failed to load submission grid rows.",
      loggerName: LOGGER_NAME,
    },
  );

  return resolveSubmissionGridRowsLoad(formId, urlState, result);
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
