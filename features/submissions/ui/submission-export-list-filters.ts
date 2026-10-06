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
