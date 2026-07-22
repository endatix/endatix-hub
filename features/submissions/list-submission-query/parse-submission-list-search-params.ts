import type { ListSubmissionsRequest } from "@/lib/endatix-api/submissions/types";
import {
  SUBMISSION_LIST_BOOLEAN_FILTER_VALUES,
  SUBMISSION_LIST_DEFAULT_PAGE,
  SUBMISSION_LIST_DEFAULT_PAGE_SIZE,
  SUBMISSION_LIST_MAX_PAGE_SIZE,
  SUBMISSION_LIST_PAGE_SIZE_OPTIONS,
  SUBMISSION_LIST_REVIEW_STATUS_VALUES,
  SUBMISSION_LIST_URL_SEARCH_PARAM_KEYS as searchParamKeys,
} from "./submission-list-query.constants";
import type {
  SubmissionListRawSearchParams,
  SubmissionListUrlState,
} from "./types";

/**
 * Extracts the first string from an array of strings or a single string.
 * @param value - The value to extract the first string from.
 * @returns The first string.
 */
function firstString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses the page number from the search params.
 * @param value - The value to parse.
 * @returns The page number.
 */
export function parseSubmissionListPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : SUBMISSION_LIST_DEFAULT_PAGE;
}

/**
 * Parses the page size from the search params.
 * @param value - The value to parse.
 * @returns The page size.
 */
export function parseSubmissionListPageSize(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return SUBMISSION_LIST_DEFAULT_PAGE_SIZE;
  }

  return (
    SUBMISSION_LIST_PAGE_SIZE_OPTIONS.find((option) => parsed <= option) ??
    SUBMISSION_LIST_MAX_PAGE_SIZE
  );
}

/**
 * Parses the calendar date from the search params.
 * @param value - The value to parse.
 * @returns The calendar date.
 */
export function parseSubmissionListCalendarDate(
  value: string | undefined,
): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? value
    : undefined;
}

/**
 * Parses the filter values from the search params.
 * @param value - The value to parse.
 * @param allowedValues - The allowed values.
 * @returns The filter values.
 */
export function parseSubmissionListFilterValues<T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
): T[] {
  if (!value) {
    return [];
  }

  const allowedSet = new Set<string>(allowedValues);
  return value.split(",").filter((item): item is T => allowedSet.has(item));
}

/**
 * Parses the search params from the URL.
 * @param searchParams - The search params to parse.
 * @returns The parsed search params.
 */
export function parseSubmissionListSearchParams(
  searchParams: SubmissionListRawSearchParams,
): SubmissionListUrlState {
  const page = parseSubmissionListPage(
    firstString(searchParams[searchParamKeys.page]) ?? undefined,
  );
  const pageSize = parseSubmissionListPageSize(
    firstString(searchParams[searchParamKeys.pageSize]) ?? undefined,
  );

  return {
    page,
    pageSize,
    isComplete: parseSubmissionListFilterValues(
      firstString(searchParams[searchParamKeys.isComplete]),
      SUBMISSION_LIST_BOOLEAN_FILTER_VALUES,
    ),
    status: parseSubmissionListFilterValues(
      firstString(searchParams[searchParamKeys.status]),
      SUBMISSION_LIST_REVIEW_STATUS_VALUES,
    ),
    isTestSubmission: parseSubmissionListFilterValues(
      firstString(searchParams[searchParamKeys.isTestSubmission]),
      SUBMISSION_LIST_BOOLEAN_FILTER_VALUES,
    ),
    createdAtFrom: parseSubmissionListCalendarDate(
      firstString(searchParams[searchParamKeys.createdAtFrom]),
    ),
    createdAtTo: parseSubmissionListCalendarDate(
      firstString(searchParams[searchParamKeys.createdAtTo]),
    ),
    startedAtFrom: parseSubmissionListCalendarDate(
      firstString(searchParams[searchParamKeys.startedAtFrom]),
    ),
    startedAtTo: parseSubmissionListCalendarDate(
      firstString(searchParams[searchParamKeys.startedAtTo]),
    ),
    completedAtFrom: parseSubmissionListCalendarDate(
      firstString(searchParams[searchParamKeys.completedAtFrom]),
    ),
    completedAtTo: parseSubmissionListCalendarDate(
      firstString(searchParams[searchParamKeys.completedAtTo]),
    ),
    submitterDisplayId:
      firstString(searchParams[searchParamKeys.submitterDisplayId])?.trim() ||
      undefined,
    submitterEmail:
      firstString(searchParams[searchParamKeys.submitterEmail])?.trim() ||
      undefined,
  };
}

/**
 * Converts the submission list URL state to a list request.
 * @param state - The submission list URL state.
 * @returns The list request.
 */
export function submissionListUrlStateToListRequest(
  state: SubmissionListUrlState,
): ListSubmissionsRequest {
  return {
    page: state.page,
    pageSize: state.pageSize,
    isComplete: state.isComplete,
    status: state.status,
    isTestSubmission: state.isTestSubmission,
    createdAtFrom: state.createdAtFrom,
    createdAtTo: state.createdAtTo,
    startedAtFrom: state.startedAtFrom,
    startedAtTo: state.startedAtTo,
    completedAtFrom: state.completedAtFrom,
    completedAtTo: state.completedAtTo,
    submitterDisplayId: state.submitterDisplayId,
    submitterProfileFilter: state.submitterEmail
      ? {
          field: "email",
          value: state.submitterEmail,
        }
      : undefined,
  };
}

/**
 * The canonical date fields.
 * @param rawCreatedAtFrom - The raw created at from.
 * @param rawCreatedAtTo - The raw created at to.
 * @param rawCompletedAtFrom - The raw completed at from.
 * @param rawCompletedAtTo - The raw completed at to.
 * @param createdAtFrom - The created at from.
 * @param createdAtTo - The created at to.
 * @param completedAtFrom - The completed at from.
 * @param completedAtTo - The completed at to.
 */
export type SubmissionListCanonicalDateFields = {
  rawCreatedAtFrom?: string;
  rawCreatedAtTo?: string;
  rawStartedAtFrom?: string;
  rawStartedAtTo?: string;
  rawCompletedAtFrom?: string;
  rawCompletedAtTo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  startedAtFrom?: string;
  startedAtTo?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
  rawSubmitterDisplayId?: string;
  submitterDisplayId?: string;
  rawSubmitterEmail?: string;
  submitterEmail?: string;
};

/**
 * Checks if the submission list URL is canonical.
 * @param rawPage - The raw page.
 * @param rawPageSize - The raw page size.
 * @param parsed - The parsed search params.
 * @param rawDates - The raw dates.
 * @returns True if the submission list URL is canonical, false otherwise.
 */
export function isCanonicalSubmissionListUrl(
  rawPage: string | undefined,
  rawPageSize: string | undefined,
  parsed: SubmissionListUrlState,
  rawDates: SubmissionListCanonicalDateFields,
): boolean {
  const canonicalPage =
    parsed.page === SUBMISSION_LIST_DEFAULT_PAGE
      ? rawPage === undefined
      : rawPage === String(parsed.page);
  const canonicalPageSize =
    parsed.pageSize === SUBMISSION_LIST_DEFAULT_PAGE_SIZE
      ? rawPageSize === undefined
      : rawPageSize === String(parsed.pageSize);

  return (
    canonicalPage &&
    canonicalPageSize &&
    rawDates.rawCreatedAtFrom === rawDates.createdAtFrom &&
    rawDates.rawCreatedAtTo === rawDates.createdAtTo &&
    rawDates.rawStartedAtFrom === rawDates.startedAtFrom &&
    rawDates.rawStartedAtTo === rawDates.startedAtTo &&
    rawDates.rawCompletedAtFrom === rawDates.completedAtFrom &&
    rawDates.rawCompletedAtTo === rawDates.completedAtTo &&
    (rawDates.rawSubmitterDisplayId?.trim() || undefined) ===
      rawDates.submitterDisplayId &&
    (rawDates.rawSubmitterEmail?.trim() || undefined) ===
      rawDates.submitterEmail
  );
}
