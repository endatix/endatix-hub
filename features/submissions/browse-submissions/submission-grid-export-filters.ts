import type { SubmissionExportListFilters } from "@/features/export";
import type { SubmissionGridUrlState } from "./submission-grid-url";

/**
 * The grid's filters as the export dialog's prefill, plus the names of the
 * active filters an export cannot apply, so the dialog can say the file may
 * hold more rows than the grid.
 */
export function exportFiltersFromGrid(
  state: SubmissionGridUrlState,
): SubmissionExportListFilters {
  const tableOnly = tableOnlyFilterNames(state);
  return {
    createdFrom: state.createdFrom,
    createdTo: state.createdTo,
    modifiedFrom: state.modifiedFrom,
    modifiedTo: state.modifiedTo,
    startedFrom: state.startedFrom,
    startedTo: state.startedTo,
    completedFrom: state.completedFrom,
    completedTo: state.completedTo,
    collectionStatus:
      state.collectionStatus.length > 0 ? state.collectionStatus : undefined,
    includeTestSubmissions: !isProductionOnly(state.isTestSubmission),
    tableOnlyFilters: tableOnly.length > 0 ? tableOnly : undefined,
  };
}

/** Only "Production" selected excludes tests; any other selection includes them. */
function isProductionOnly(values: readonly string[]): boolean {
  return values.includes("false") && !values.includes("true");
}

/** Exports have no review or submitter filter, and cannot export tests alone. */
function tableOnlyFilterNames(state: SubmissionGridUrlState): string[] {
  const testOnly =
    state.isTestSubmission.length === 1 && state.isTestSubmission[0] === "true";
  return [
    state.status.length > 0 && "Review",
    Boolean(state.submitterDisplayId || state.submitterEmail) && "Submitter",
    testOnly && "Submission Type",
  ].filter((name): name is string => typeof name === "string");
}
