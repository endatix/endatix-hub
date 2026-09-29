"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { EndatixApi } from "@/lib/endatix-api";
import type { PrepareReportingExportSummary } from "@/lib/endatix-api/reporting/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { backfillReportingSubmissions } from "../backfill-reporting-submissions.server";

const LOGGER_NAME = "export.prepare-reporting-export";

export type PrepareReportingExportOptions = {
  fullRecompile?: boolean;
};

export type PrepareReportingExportResult =
  Result<PrepareReportingExportSummary>;

export async function prepareReportingExportAction(
  formId: string,
  options: PrepareReportingExportOptions = {},
): Promise<PrepareReportingExportResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const reportingExportEnabled = await reportingExportFlag();
  if (!reportingExportEnabled) {
    return Result.error(
      "Reporting export is not enabled for this environment.",
    );
  }

  const fullRecompile = options.fullRecompile === true;
  const api = new EndatixApi(session?.accessToken);

  const compileResult = await api.reporting.compileSchema(formId, {
    replace: fullRecompile,
  });
  if (!compileResult.success) {
    return toResult(compileResult, {
      fallbackMessage: "Failed to compile export schema.",
      logMessage: "Failed to compile export schema.",
      loggerName: LOGGER_NAME,
    });
  }

  const backfill = await backfillReportingSubmissions(api, formId, {
    force: fullRecompile,
    loggerName: LOGGER_NAME,
  });
  if (Result.isError(backfill)) {
    return backfill;
  }

  const { batches, processed, skipped, failed, finished } = backfill.value;
  if (!finished) {
    return Result.error(
      "Backfill stopped after the safety batch limit. Run prepare again to continue.",
    );
  }

  return Result.success({
    formDefinitionId: compileResult.data.formDefinitionId,
    batches,
    processed,
    skipped,
    failed,
  });
}
