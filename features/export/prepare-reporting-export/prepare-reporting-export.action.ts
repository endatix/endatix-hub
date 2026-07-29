"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { EndatixApi } from "@/lib/endatix-api";
import type { PrepareReportingExportSummary } from "@/lib/endatix-api/reporting/types";
import { Result } from "@/lib/result";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BACKFILL_BATCHES = 100;

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
    return Result.error(
      compileResult.error.message || "Failed to compile export schema.",
    );
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
      return Result.error(
        backfillResult.error.message || "Failed to backfill submissions.",
      );
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
