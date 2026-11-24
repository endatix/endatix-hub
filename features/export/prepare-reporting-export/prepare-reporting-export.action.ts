"use server";

import { auth } from "@/auth";
import {
  authorization,
  isPermissionDenied,
  Permissions,
} from "@/features/auth/authorization";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { EndatixApi } from "@/lib/endatix-api";
import type { PrepareReportingExportSummary } from "@/lib/endatix-api/reporting/types";
import { Result, type Error as ResultError, type Success } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { backfillReportingSubmissions } from "../backfill-reporting-submissions.server";
import {
  previousSchema,
  recordPrepareFailure,
  incompleteBackfill,
  type PrepareStep,
} from "./prepare-failure.server";

const LOGGER_NAME = "export.prepare-reporting-export";

export type PrepareReportingExportOptions = {
  fullRecompile?: boolean;
};

export type PrepareReportingExportResult =
  | Success<PrepareReportingExportSummary>
  | (ResultError & {
      step?: PrepareStep;
      previousSchema?: ReturnType<typeof previousSchema>;
    });

type CheckPermission = Awaited<
  ReturnType<typeof authorization>
>["checkPermission"];

/** A full recompile clears flattened data, so the API keeps it behind `forms.edit`. */
async function refuseFullRecompile(
  checkPermission: CheckPermission,
): Promise<PrepareReportingExportResult | null> {
  const canEdit = await checkPermission(Permissions.Forms.Edit);
  if (canEdit.success) {
    return null;
  }

  return Result.error(
    isPermissionDenied(canEdit)
      ? "A full recompile needs permission to edit forms."
      : "Could not check permission to recompile reporting data.",
  );
}

/** Compiles the form's export schema and backfills its submissions; a full recompile (replace and force) needs `forms.edit`. */
export async function prepareReportingExportAction(
  formId: string,
  options: PrepareReportingExportOptions = {},
): Promise<PrepareReportingExportResult | never> {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const reportingExportEnabled = await reportingExportFlag();
  if (!reportingExportEnabled) {
    return Result.error(
      "Reporting export is not enabled for this environment.",
    );
  }

  const fullRecompile = options.fullRecompile === true;
  const refused = fullRecompile && (await refuseFullRecompile(checkPermission));
  if (refused) {
    return refused;
  }

  const api = new EndatixApi(session?.accessToken);

  const compiled = await api.reporting.compileSchema(formId, {
    replace: fullRecompile,
  });
  const compileResult = toResult(compiled, {
    fallbackMessage: "Failed to compile export schema.",
  });
  if (Result.isError(compileResult)) {
    return {
      ...recordPrepareFailure(formId, "compile", compileResult),
      previousSchema: previousSchema(compiled),
    };
  }

  const backfill = await backfillReportingSubmissions(api, formId, {
    force: fullRecompile,
    loggerName: LOGGER_NAME,
  });
  if (Result.isError(backfill)) {
    return recordPrepareFailure(formId, "backfill", backfill);
  }

  const failure = incompleteBackfill(backfill.value);
  if (failure) return recordPrepareFailure(formId, "backfill", failure);
  const { batches, processed, skipped, failed } = backfill.value;

  return Result.success({
    formDefinitionId: compileResult.value.formDefinitionId,
    batches,
    processed,
    skipped,
    failed,
  });
}
