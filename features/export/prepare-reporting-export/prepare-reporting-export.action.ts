"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { EndatixApi } from "@/lib/endatix-api";
import type { PrepareReportingExportSummary } from "@/lib/endatix-api/reporting/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BACKFILL_BATCHES = 100;
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

  let afterSubmissionId: string | undefined;
  let batches = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  while (batches < MAX_BACKFILL_BATCHES) {
    const backfillResult = await api.reporting.backfillSubmissions(formId, {
      batchSize: DEFAULT_BATCH_SIZE,
      afterSubmissionId,
      force: fullRecompile,
    });

    if (!backfillResult.success) {
      return toResult(backfillResult, {
        fallbackMessage: "Failed to backfill submissions.",
        logMessage: "Failed to backfill submissions.",
        loggerName: LOGGER_NAME,
      });
    }

    batches += 1;
    processed += backfillResult.data.processed;
    skipped += backfillResult.data.skipped;
    failed += backfillResult.data.failed;

    if (!backfillResult.data.hasMore) {
      break;
    }

    if (!backfillResult.data.nextAfterSubmissionId) {
      break;
    }

    afterSubmissionId = String(backfillResult.data.nextAfterSubmissionId);
  }

  if (batches >= MAX_BACKFILL_BATCHES) {
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
