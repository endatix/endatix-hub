import {
  SUBMISSION_LIST_BOOLEAN_FILTER_VALUES,
  SUBMISSION_LIST_REVIEW_STATUS_VALUES,
} from "./submission-list-query.constants";
import {
  parseSubmissionListCalendarDate,
  parseSubmissionListFilterValues,
  parseSubmissionListSorting,
  serializeSubmissionListSorting,
} from "./parse-submission-list-search-params";
import type { SubmissionListSortItem, SubmissionListUrlState } from "./types";

function sortedSetToCsv(set: Set<string>): string | undefined {
  const csv = Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .join(",");
  return csv.length > 0 ? csv : undefined;
}

/**
 * Converts the client filters to a submission list URL state.
 * @param input - The input filters.
 * @returns The submission list URL state.
 */
export function submissionListUrlStateFromClientFilters(input: {
  page: number;
  pageSize: number;
  isComplete: Set<string>;
  status: Set<string>;
  isTestSubmission: Set<string>;
  createdAtFrom?: string;
  createdAtTo?: string;
  modifiedAtFrom?: string;
  modifiedAtTo?: string;
  startedAtFrom?: string;
  startedAtTo?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
  submitterDisplayId?: string;
  submitterEmail?: string;
  sorting?: readonly SubmissionListSortItem[];
}): SubmissionListUrlState {
  return {
    page: input.page,
    pageSize: input.pageSize,
    isComplete: parseSubmissionListFilterValues(
      sortedSetToCsv(input.isComplete),
      SUBMISSION_LIST_BOOLEAN_FILTER_VALUES,
    ),
    status: parseSubmissionListFilterValues(
      sortedSetToCsv(input.status),
      SUBMISSION_LIST_REVIEW_STATUS_VALUES,
    ),
    isTestSubmission: parseSubmissionListFilterValues(
      sortedSetToCsv(input.isTestSubmission),
      SUBMISSION_LIST_BOOLEAN_FILTER_VALUES,
    ),
    createdAtFrom: parseSubmissionListCalendarDate(input.createdAtFrom),
    createdAtTo: parseSubmissionListCalendarDate(input.createdAtTo),
    modifiedAtFrom: parseSubmissionListCalendarDate(input.modifiedAtFrom),
    modifiedAtTo: parseSubmissionListCalendarDate(input.modifiedAtTo),
    startedAtFrom: parseSubmissionListCalendarDate(input.startedAtFrom),
    startedAtTo: parseSubmissionListCalendarDate(input.startedAtTo),
    completedAtFrom: parseSubmissionListCalendarDate(input.completedAtFrom),
    completedAtTo: parseSubmissionListCalendarDate(input.completedAtTo),
    submitterDisplayId: input.submitterDisplayId?.trim() || undefined,
    submitterEmail: input.submitterEmail?.trim() || undefined,
    sorting: parseSubmissionListSorting(
      serializeSubmissionListSorting(input.sorting ?? []),
    ),
  };
}
