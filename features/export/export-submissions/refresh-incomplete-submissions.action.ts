"use server";

import { auth } from "@/auth";
import {
  authorization,
  isPermissionDenied,
  Permissions,
} from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { backfillReportingSubmissions } from "../backfill-reporting-submissions.server";

const LOGGER_NAME = "export.refresh-incomplete-submissions";

/**
 * How far the pre-export refresh got. The export runs in every case except an
 * API failure: a partial or skipped refresh only makes incomplete rows stale.
 */
export type IncompleteRefreshOutcome =
  /** Updating needs `forms.edit`, which exporting does not; rows are as of their last update. */
  | { kind: "skipped" }
  | { kind: "refreshed"; failed: number; finished: boolean };

export type RefreshIncompleteSubmissionsResult =
  Result<IncompleteRefreshOutcome>;

/**
 * Brings incomplete submissions into the reporting read model before an
 * export that includes them. Backfill only: the export dialog has already
 * confirmed the schema exists, so there is nothing to compile.
 */
export async function refreshIncompleteSubmissionsAction(
  formId: string,
): Promise<RefreshIncompleteSubmissionsResult> {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const canRefresh = await checkPermission(Permissions.Forms.Edit);
  if (!canRefresh.success) {
    if (isPermissionDenied(canRefresh)) {
      return Result.success({ kind: "skipped" });
    }
    return Result.error("Could not check permission to update submissions.");
  }

  const api = new EndatixApi(session?.accessToken);
  const backfill = await backfillReportingSubmissions(api, formId, {
    completionScope: "incomplete",
    loggerName: LOGGER_NAME,
  });
  if (Result.isError(backfill)) {
    return backfill;
  }

  return Result.success({
    kind: "refreshed",
    failed: backfill.value.failed,
    finished: backfill.value.finished,
  });
}
