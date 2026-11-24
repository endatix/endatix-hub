import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import type { BackfillSubmissionsRequest } from "@/lib/endatix-api/reporting/types";
import { Result, type Error as ResultError } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

const DEFAULT_BATCH_SIZE = 100;
export const MAX_BACKFILL_BATCHES = 100;

export type BackfillRunSummary = {
  batches: number;
  processed: number;
  skipped: number;
  failed: number;
  /** False when the batch cap stopped the run with submissions still left. */
  finished: boolean;
};

function interruptedPage(page: ResultError, summary: BackfillRunSummary) {
  if (!summary.batches) return page;
  return {
    ...page,
    message: `${page.message} Before the interruption: ${summary.processed} processed, ${summary.skipped} skipped, ${summary.failed} failed.`,
  };
}

/**
 * Pages through `POST …/submissions/backfill` until the API reports no more
 * submissions, or until {@link MAX_BACKFILL_BATCHES}. Hitting the cap is not an
 * error here: callers decide whether a partial run is acceptable.
 */
export async function backfillReportingSubmissions(
  api: EndatixApi,
  formId: string,
  options: Pick<BackfillSubmissionsRequest, "force" | "completionScope"> & {
    loggerName: string;
  },
): Promise<Result<BackfillRunSummary>> {
  const summary: BackfillRunSummary = {
    batches: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    finished: false,
  };
  let afterSubmissionId: string | undefined;

  while (summary.batches < MAX_BACKFILL_BATCHES) {
    const backfillResult = await api.reporting.backfillSubmissions(formId, {
      batchSize: DEFAULT_BATCH_SIZE,
      afterSubmissionId,
      force: options.force,
      completionScope: options.completionScope,
    });

    const page = toResult(backfillResult, {
      fallbackMessage: "Failed to backfill submissions.",
      logMessage: "Failed to backfill submissions.",
      loggerName: options.loggerName,
    });
    if (Result.isError(page)) return interruptedPage(page, summary);

    summary.batches += 1;
    summary.processed += page.value.processed;
    summary.skipped += page.value.skipped;
    summary.failed += page.value.failed;

    // Check for the end before the cap, so a run whose last page is batch
    // 100 counts as finished.
    const next = page.value.nextAfterSubmissionId;
    if (!page.value.hasMore || !next) {
      summary.finished = !page.value.hasMore;
      return Result.success(summary);
    }

    afterSubmissionId = String(next);
  }

  return Result.success(summary);
}
