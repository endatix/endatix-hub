import { useMemo } from "react";
import type { SubmissionExportListFilters } from "@/features/export/export-url";
import type { SubmissionDateFilters } from "@/features/submissions/ui/table/date-filter-types";

/** The submissions list's filters, as the toolbar holds them. */
export interface SubmissionListFiltersForExport {
  dates: SubmissionDateFilters;
  collectionStatus: Iterable<string>;
  testSubmission: Iterable<string>;
  review: Iterable<string>;
  submitterFiltered: boolean;
}

/**
 * Grid Submission Type filter → Include test submissions.
 * Production-only excludes tests. No selection, test-only, or both includes them,
 * matching a grid that is not limited to production rows.
 */
export function includeTestSubmissionsFromGridFilter(
  values: Iterable<string>,
): boolean {
  const selected = new Set(values);
  return !(selected.has("false") && !selected.has("true"));
}

/**
 * The list's filters as the export dialog's prefill: the same Status codes,
 * dates and test toggle, plus the names of the active filters an export
 * cannot apply, so the dialog can say the file may hold more rows.
 */
export function submissionExportListFilters(
  list: SubmissionListFiltersForExport,
): SubmissionExportListFilters {
  const codes = [...list.collectionStatus];
  const tableOnly = tableOnlyFilterNames(list);
  return {
    ...exportDateRanges(list.dates),
    collectionStatus: codes.length > 0 ? codes : undefined,
    includeTestSubmissions: includeTestSubmissionsFromGridFilter(
      list.testSubmission,
    ),
    tableOnlyFilters: tableOnly.length > 0 ? tableOnly : undefined,
  };
}

/**
 * Exports have no review or submitter filter, and "Include test submissions"
 * cannot export test submissions alone.
 */
function tableOnlyFilterNames(list: SubmissionListFiltersForExport): string[] {
  const test = new Set(list.testSubmission);
  const testOnly = test.size === 1 && test.has("true");
  return [
    [...list.review].length > 0 && "Review",
    list.submitterFiltered && "Submitter",
    testOnly && "Submission Type",
  ].filter((name): name is string => typeof name === "string");
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

/** The prefill, rebuilt only when one of the list's filters changes. */
export function useSubmissionExportListFilters(
  list: SubmissionListFiltersForExport,
): SubmissionExportListFilters {
  const { dates, collectionStatus, testSubmission, review, submitterFiltered } =
    list;
  return useMemo(
    () =>
      submissionExportListFilters({
        dates,
        collectionStatus,
        testSubmission,
        review,
        submitterFiltered,
      }),
    [dates, collectionStatus, testSubmission, review, submitterFiltered],
  );
}
