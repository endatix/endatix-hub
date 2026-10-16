"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { SubmissionGridSearchKeysResponse } from "@/lib/endatix-api/reporting/submission-grid-types";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { Result, toResult } from "@/lib/result";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";

const LOGGER_NAME = "submissions.choose-filterable-questions";

export type SearchKeysResult = Result<SubmissionGridSearchKeysResponse>;

/** Makes a column filterable; its filter is preparing until the rebuild ends. */
export async function addSearchKeyAction(
  formId: string,
  key: string,
): Promise<SearchKeysResult> {
  return changeSearchKeys(
    formId,
    "Unable to make the column filterable.",
    (api) => api.reporting.submissionGrid.addSearchKey(formId, key),
  );
}

/** Stops a column an editor chose from being filterable. */
export async function removeSearchKeyAction(
  formId: string,
  key: string,
): Promise<SearchKeysResult> {
  return changeSearchKeys(
    formId,
    "Unable to stop filtering the column.",
    (api) => api.reporting.submissionGrid.removeSearchKey(formId, key),
  );
}

async function changeSearchKeys(
  formId: string,
  failure: string,
  change: (
    api: EndatixApi,
  ) => Promise<ApiResult<SubmissionGridSearchKeysResponse>>,
): Promise<SearchKeysResult> {
  const session = await auth();
  const refused = await refuseSearchKeyChange(session);
  if (refused) return refused;

  const result = toResult(await change(new EndatixApi(session?.accessToken)), {
    fallbackMessage: failure,
    logMessage: failure,
    loggerName: LOGGER_NAME,
  });
  if (Result.isSuccess(result)) revalidateFormReporting(formId);
  return result;
}

/** The grid and the settings both show which columns are filterable. */
function revalidateFormReporting(formId: string) {
  revalidatePath(`/forms/${formId}/submissions`);
  revalidatePath(`/forms/${formId}/settings`);
}

/** Redirects without `forms.edit`; an error when the flag is off. */
async function refuseSearchKeyChange(
  session: Session | null,
): Promise<SearchKeysResult | null> {
  const { requireAllPermissions } = await authorization(session);
  await requireAllPermissions([Permissions.Access.Hub, Permissions.Forms.Edit]);
  return (await reportingExportFlag())
    ? null
    : Result.error("Reporting export is not enabled for this environment.");
}
