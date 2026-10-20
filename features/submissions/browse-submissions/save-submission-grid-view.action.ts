"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { SubmissionView } from "@/lib/endatix-api/reporting/submission-view-types";
import {
  isConflictError,
  type ApiResult,
} from "@/lib/endatix-api/shared/api-result";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";

const LOGGER_NAME = "submissions.browse.save-view";

export type SaveSubmissionGridViewResult = Result<SubmissionView>;

/**
 * Saves the grid view everyone on the form sees. `view.revision` is the one
 * the grid read; a newer save in between answers 409.
 */
export async function saveSubmissionGridViewAction(
  formId: string,
  view: SubmissionView,
): Promise<SaveSubmissionGridViewResult> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Forms.Edit);

  if (!(await reportingExportFlag())) {
    return Result.error(
      "Reporting export is not enabled for this environment.",
    );
  }

  const api = new EndatixApi(session?.accessToken);
  const saved = await api.reporting.submissionViews.save(formId, view);
  const result = toResult(saved, saveResultOptions(saved));
  if (Result.isSuccess(result)) {
    revalidatePath(`/(main)/forms/${formId}/submissions`);
  }
  return result;
}

/** A stale revision is an expected race, not an operational failure. */
function saveResultOptions(saved: ApiResult<SubmissionView>) {
  const fallbackMessage = "Unable to save the view. Please try again.";
  return isConflictError(saved)
    ? { fallbackMessage }
    : {
        fallbackMessage,
        logMessage: "Failed to save submission grid view.",
        loggerName: LOGGER_NAME,
      };
}
