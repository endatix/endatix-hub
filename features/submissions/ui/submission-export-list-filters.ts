import {
  completionStatusFromIsCompleteFilter,
  includeTestSubmissionsFromGridFilter,
} from "@/features/export/export-submissions/export-dialog-filters";
import type { SubmissionExportListFilters } from "@/features/export/export-url";
import { isCompleteValuesFromCollectionStatus } from "@/features/submissions/ui/describe-collection-status";
import type { SubmissionDateFilters } from "@/features/submissions/ui/table/date-filter-types";

/**
 * The grid's filters as the export dialog's prefill: dates as they are, the
 * Status facet as Completed / Incomplete / All, Submission Type as the test
 * toggle. The dialog says these came from the table.
 */
export function submissionExportListFilters(
  dates: SubmissionDateFilters,
  collectionStatus: Iterable<string>,
  testSubmission: Iterable<string>,
): SubmissionExportListFilters {
  return {
    ...exportDateRanges(dates),
    completionStatus: completionStatusFromIsCompleteFilter(
      isCompleteValuesFromCollectionStatus(collectionStatus),
    ),
    includeTestSubmissions:
      includeTestSubmissionsFromGridFilter(testSubmission),
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
