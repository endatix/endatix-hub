import { includeTestSubmissionsFromGridFilter } from "@/features/export/export-submissions/export-dialog-filters";
import type { SubmissionExportListFilters } from "@/features/export/export-url";
import type { SubmissionDateFilters } from "@/features/submissions/ui/table/date-filter-types";

export function submissionExportListFilters(
  dates: SubmissionDateFilters,
  collectionStatus: Iterable<string>,
  testSubmission: Iterable<string>,
): SubmissionExportListFilters {
  const codes = [...collectionStatus];
  return {
    ...exportDateRanges(dates),
    collectionStatus: codes.length > 0 ? codes : undefined,
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
