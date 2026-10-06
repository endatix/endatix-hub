import {
  completionStatusFromIsCompleteFilter,
  includeTestSubmissionsFromGridFilter,
} from "@/features/export/export-submissions/export-dialog-filters";
import type { SubmissionExportListFilters } from "@/features/export/export-url";
import {
  completionCoversCollectionStatus,
  isCompleteValuesFromCollectionStatus,
} from "@/features/submissions/ui/describe-collection-status";
import type { SubmissionDateFilters } from "@/features/submissions/ui/table/date-filter-types";

/**
 * The grid's filters as the export dialog's prefill: dates as they are, the
 * Status facet as the narrowest Completed / Incomplete / All that holds every
 * listed row, Submission Type as the test toggle. The dialog says these came
 * from the table, and says when the completion is wider than the list.
 */
export function submissionExportListFilters(
  dates: SubmissionDateFilters,
  collectionStatus: Iterable<string>,
  testSubmission: Iterable<string>,
): SubmissionExportListFilters {
  return {
    ...exportDateRanges(dates),
    ...exportCompletion([...collectionStatus]),
    includeTestSubmissions:
      includeTestSubmissionsFromGridFilter(testSubmission),
  };
}

/**
 * The narrowest completion choice that still holds every row the list shows,
 * flagged when it holds more, so the dialog can say so.
 */
function exportCompletion(
  collectionStatus: readonly string[],
): SubmissionExportListFilters {
  return {
    completionStatus: completionStatusFromIsCompleteFilter(
      isCompleteValuesFromCollectionStatus(collectionStatus),
    ),
    statusFilterWiderThanList:
      !completionCoversCollectionStatus(collectionStatus),
  };
}

function exportDateRanges(
  dates: SubmissionDateFilters,
): SubmissionExportListFilters {
  return {
    createdFrom: dates.createdAt.from,
    createdTo: dates.createdAt.to,
    modifiedFrom: dates.modifiedAt.from,
    modifiedTo: dates.modifiedAt.to,
    startedFrom: dates.startedAt.from,
    startedTo: dates.startedAt.to,
    completedFrom: dates.completedAt.from,
    completedTo: dates.completedAt.to,
  };
}
