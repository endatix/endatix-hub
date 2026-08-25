import type { ListSubmissionsRequest } from "@/lib/endatix-api/submissions/types";
import {
  parseCalendarDateYmd,
  pickDateRangeFilters,
} from "@/lib/endatix-api/shared/list-query";
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
  SubmissionListSortItem,
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
  return parseCalendarDateYmd(value);
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

const SORT_COLUMN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Serializes sorting to the Hub URL `sort` value (`id:asc,id:desc`).
 */
export function serializeSubmissionListSorting(
  sorting: readonly SubmissionListSortItem[],
): string | undefined {
  if (sorting.length === 0) {
    return undefined;
  }

  return sorting
    .map((item) => `${item.id}:${item.desc ? "desc" : "asc"}`)
    .join(",");
}

/**
 * Parses the Hub URL `sort` value into TanStack-compatible sorting.
 * Invalid segments are dropped.
 */
export function parseSubmissionListSorting(
  value: string | undefined,
): SubmissionListSortItem[] {
  if (!value) {
    return [];
  }

  const sorting: SubmissionListSortItem[] = [];
  for (const segment of value.split(",")) {
    const trimmed = segment.trim();
    const separatorIndex = trimmed.lastIndexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const id = trimmed.slice(0, separatorIndex);
    const direction = trimmed.slice(separatorIndex + 1);
    if (!SORT_COLUMN_ID_PATTERN.test(id)) {
      continue;
    }
    if (direction !== "asc" && direction !== "desc") {
      continue;
    }

    sorting.push({ id, desc: direction === "desc" });
  }

  return sorting;
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

  const dateFilters = pickDateRangeFilters(
    (key) => firstString(searchParams[key]),
    ["created", "modified", "started", "completed"] as const,
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
    ...dateFilters,
    submitterDisplayId:
      firstString(searchParams[searchParamKeys.submitterDisplayId])?.trim() ||
      undefined,
    submitterEmail:
      firstString(searchParams[searchParamKeys.submitterEmail])?.trim() ||
      undefined,
    sorting: parseSubmissionListSorting(
      firstString(searchParams[searchParamKeys.sort]),
    ),
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
  const primarySort = state.sorting[0];
  const sortBy = isSubmissionListSortBy(primarySort?.id)
    ? primarySort.id
    : undefined;

  return {
    page: state.page,
    pageSize: state.pageSize,
    sortBy,
    sortDir:
      sortBy === undefined || primarySort === undefined
        ? undefined
        : primarySort.desc
          ? "desc"
          : "asc",
    isComplete: state.isComplete,
    status: state.status,
    isTestSubmission: state.isTestSubmission,
    createdFrom: state.createdFrom,
    createdTo: state.createdTo,
    modifiedFrom: state.modifiedFrom,
    modifiedTo: state.modifiedTo,
    startedFrom: state.startedFrom,
    startedTo: state.startedTo,
    completedFrom: state.completedFrom,
    completedTo: state.completedTo,
    submitterDisplayId: state.submitterDisplayId,
    submitterProfileFilter: state.submitterEmail
      ? {
          field: "email",
          value: state.submitterEmail,
        }
      : undefined,
  };
}

const SUBMISSION_LIST_API_SORT_FIELDS = new Set([
  "createdAt",
  "modifiedAt",
  "startedAt",
  "completedAt",
  "id",
]);

function isSubmissionListSortBy(
  id: string | undefined,
): id is NonNullable<ListSubmissionsRequest["sortBy"]> {
  return id !== undefined && SUBMISSION_LIST_API_SORT_FIELDS.has(id);
}

/**
 * The canonical date fields.
 * @param rawCreatedFrom - The raw created at from.
 * @param rawCreatedTo - The raw created at to.
 * @param rawCompletedFrom - The raw completed at from.
 * @param rawCompletedTo - The raw completed at to.
 * @param createdFrom - The created at from.
 * @param createdTo - The created at to.
 * @param completedFrom - The completed at from.
 * @param completedTo - The completed at to.
 */
export type SubmissionListCanonicalDateFields = {
  rawCreatedFrom?: string;
  rawCreatedTo?: string;
  rawModifiedFrom?: string;
  rawModifiedTo?: string;
  rawStartedFrom?: string;
  rawStartedTo?: string;
  rawCompletedFrom?: string;
  rawCompletedTo?: string;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  startedFrom?: string;
  startedTo?: string;
  completedFrom?: string;
  completedTo?: string;
  rawSubmitterDisplayId?: string;
  submitterDisplayId?: string;
  rawSubmitterEmail?: string;
  submitterEmail?: string;
  rawSort?: string;
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

  const serializedSort = serializeSubmissionListSorting(parsed.sorting);
  const canonicalSort =
    serializedSort === undefined
      ? rawDates.rawSort === undefined
      : rawDates.rawSort === serializedSort;

  return (
    canonicalPage &&
    canonicalPageSize &&
    canonicalSort &&
    rawDates.rawCreatedFrom === rawDates.createdFrom &&
    rawDates.rawCreatedTo === rawDates.createdTo &&
    rawDates.rawModifiedFrom === rawDates.modifiedFrom &&
    rawDates.rawModifiedTo === rawDates.modifiedTo &&
    rawDates.rawStartedFrom === rawDates.startedFrom &&
    rawDates.rawStartedTo === rawDates.startedTo &&
    rawDates.rawCompletedFrom === rawDates.completedFrom &&
    rawDates.rawCompletedTo === rawDates.completedTo &&
    (rawDates.rawSubmitterDisplayId?.trim() || undefined) ===
      rawDates.submitterDisplayId &&
    (rawDates.rawSubmitterEmail?.trim() || undefined) ===
      rawDates.submitterEmail
  );
}
