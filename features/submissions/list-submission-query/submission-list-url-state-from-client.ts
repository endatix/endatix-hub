import {
  SUBMISSION_LIST_BOOLEAN_FILTER_VALUES,
  SUBMISSION_LIST_REVIEW_STATUS_VALUES,
} from "./submission-list-query.constants";
import {
  parseSubmissionListCalendarDate,
  parseSubmissionListFilterValues,
} from "./parse-submission-list-search-params";
import type { SubmissionListUrlState } from "./types";

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
  completedAtFrom?: string;
  completedAtTo?: string;
  submitterDisplayId?: string;
  submitterEmail?: string;
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
    completedAtFrom: parseSubmissionListCalendarDate(input.completedAtFrom),
    completedAtTo: parseSubmissionListCalendarDate(input.completedAtTo),
    submitterDisplayId: input.submitterDisplayId?.trim() || undefined,
    submitterEmail: input.submitterEmail?.trim() || undefined,
  };
}
