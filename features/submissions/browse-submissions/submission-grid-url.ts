import { BUILT_IN_COLLECTION_STATUSES } from "@/features/submissions/domain";
import { collectionStatusFromLegacyIsComplete } from "@/features/submissions/ui/describe-collection-status";
import type {
  ListSubmissionGridRowsRequest,
  SubmissionGridAnswerFilter,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import { pickDateRangeFilters } from "@/lib/endatix-api/shared/list-query";
import type {
  AuditDateFilters,
  DateRangeFilter,
  SortDir,
} from "@/lib/endatix-api/shared/types";
import type {
  BooleanFilterValue,
  SubmissionReviewStatus,
} from "@/lib/endatix-api/submissions/types";
import { firstSearchParam, type SearchParam } from "@/lib/utils/next-utils";
import {
  answerFilterUrlEntries,
  hasAnswerFilterPrefix,
  parseAnswerFilters,
} from "./submission-grid-answer-filters";
import {
  SUBMISSION_GRID_BOOLEAN_VALUES,
  SUBMISSION_GRID_DATE_STEMS,
  SUBMISSION_GRID_DEFAULT_PAGE,
  SUBMISSION_GRID_DEFAULT_PAGE_SIZE,
  SUBMISSION_GRID_PAGE_SIZE_OPTIONS,
  SUBMISSION_GRID_REVIEW_STATUS_VALUES,
  SUBMISSION_GRID_SORT_FIELDS,
  SUBMISSION_GRID_URL_KEYS as keys,
} from "./submission-grid-url.constants";

export type SubmissionGridSortField =
  (typeof SUBMISSION_GRID_SORT_FIELDS)[number];

export type SubmissionGridSort = {
  field: SubmissionGridSortField;
  direction: SortDir;
};

export type SubmissionGridUrlState = {
  page: number;
  pageSize: number;
  collectionStatus: string[];
  status: SubmissionReviewStatus[];
  isTestSubmission: BooleanFilterValue[];
  submitterDisplayId?: string;
  submitterEmail?: string;
  sort?: SubmissionGridSort;
  /** Visible answer column keys in order; `undefined` means the default view. */
  columns?: string[];
  answerFilters: SubmissionGridAnswerFilter[];
} & AuditDateFilters &
  DateRangeFilter<"started" | "completed">;

export type SubmissionGridRawSearchParams = Record<string, SearchParam>;

type ReadParam = (key: string) => string | undefined;

export function parseSubmissionGridUrl(
  raw: SubmissionGridRawSearchParams,
): SubmissionGridUrlState {
  const read: ReadParam = (key) =>
    firstSearchParam(raw[key])?.trim() || undefined;

  return {
    page: parsePage(read(keys.page)),
    pageSize: parsePageSize(read(keys.pageSize)),
    ...parseFilters(read),
    sort: parseSort(read(keys.sort)),
    columns: parseColumnKeys(read(keys.columns)),
    answerFilters: parseAnswerFilters(raw),
  };
}

/** Defaults are omitted, so one state has exactly one URL. */
export function serializeSubmissionGridUrl(
  state: SubmissionGridUrlState,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of serializedEntries(state)) {
    if (value) params.set(key, value);
  }

  return params;
}

export function serializeSubmissionGridSort(
  sort: SubmissionGridSort | undefined,
): string | undefined {
  return sort ? `${sort.field}:${sort.direction}` : undefined;
}

/**
 * True when the URL already says what the parsed state says. An explicit
 * first page or default page size is accepted: shared list chrome writes them.
 */
export function isCanonicalSubmissionGridUrl(
  raw: SubmissionGridRawSearchParams,
  state: SubmissionGridUrlState,
): boolean {
  const written = new URLSearchParams();
  for (const key of writtenKeys(raw)) {
    const value = firstSearchParam(raw[key]);
    if (value !== undefined && !isWrittenDefault(key, value)) {
      written.set(key, value);
    }
  }

  return (
    sortedQuery(written) === sortedQuery(serializeSubmissionGridUrl(state))
  );
}

export function buildSubmissionGridPath(
  formId: string,
  state: SubmissionGridUrlState,
): string {
  const query = serializeSubmissionGridUrl(state).toString();
  return query
    ? `/forms/${formId}/submissions?${query}`
    : `/forms/${formId}/submissions`;
}

export function toSubmissionGridRowsRequest(
  state: SubmissionGridUrlState,
  columns: readonly string[],
): ListSubmissionGridRowsRequest {
  return {
    page: state.page,
    pageSize: state.pageSize,
    sortBy: state.sort?.field,
    sortDir: state.sort?.direction,
    collectionStatus: state.collectionStatus,
    status: state.status,
    isTestSubmission: state.isTestSubmission,
    ...dateFilters(state),
    ...submitterFilters(state),
    columns,
    answerFilters: state.answerFilters,
  };
}

const DATE_KEYS = SUBMISSION_GRID_DATE_STEMS.flatMap(
  (stem) => [`${stem}From`, `${stem}To`] as const,
);

type DateKey = (typeof DATE_KEYS)[number];

function parseFilters(read: ReadParam) {
  return {
    collectionStatus: parseCollectionStatus(read),
    status: pickAllowed(
      read(keys.status),
      SUBMISSION_GRID_REVIEW_STATUS_VALUES,
    ),
    isTestSubmission: pickAllowed(
      read(keys.isTestSubmission),
      SUBMISSION_GRID_BOOLEAN_VALUES,
    ),
    ...pickDateRangeFilters(read, SUBMISSION_GRID_DATE_STEMS),
    submitterDisplayId: read(keys.submitterDisplayId),
    submitterEmail: read(keys.submitterEmail),
  };
}

function serializedEntries(
  state: SubmissionGridUrlState,
): ReadonlyArray<readonly [string, string | undefined]> {
  return [
    [keys.page, unlessDefault(state.page, SUBMISSION_GRID_DEFAULT_PAGE)],
    [
      keys.pageSize,
      unlessDefault(state.pageSize, SUBMISSION_GRID_DEFAULT_PAGE_SIZE),
    ],
    [keys.collectionStatus, state.collectionStatus.join(",")],
    [keys.status, state.status.join(",")],
    [keys.isTestSubmission, state.isTestSubmission.join(",")],
    ...DATE_KEYS.map((key) => [key, state[key]] as const),
    [keys.submitterDisplayId, state.submitterDisplayId],
    [keys.submitterEmail, state.submitterEmail],
    [keys.sort, serializeSubmissionGridSort(state.sort)],
    [keys.columns, state.columns?.join(",")],
    ...answerFilterUrlEntries(state.answerFilters),
  ];
}

function unlessDefault(
  value: number,
  defaultValue: number,
): string | undefined {
  return value === defaultValue ? undefined : String(value);
}

function dateFilters(state: SubmissionGridUrlState) {
  return pickDateRangeFilters(
    (key) => state[key as DateKey],
    SUBMISSION_GRID_DATE_STEMS,
  );
}

function submitterFilters({
  submitterDisplayId,
  submitterEmail,
}: SubmissionGridUrlState) {
  return {
    submitterDisplayId,
    submitterProfileFilter: submitterEmail
      ? { field: "email", value: submitterEmail }
      : undefined,
  };
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : SUBMISSION_GRID_DEFAULT_PAGE;
}

/** Rounds up to the next offered size, so a hand-typed size still pages. */
function parsePageSize(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return SUBMISSION_GRID_DEFAULT_PAGE_SIZE;
  }

  const options = SUBMISSION_GRID_PAGE_SIZE_OPTIONS;
  return (
    options.find((option) => parsed <= option) ??
    options.at(-1) ??
    SUBMISSION_GRID_DEFAULT_PAGE_SIZE
  );
}

function parseCollectionStatus(read: ReadParam): string[] {
  const codes = read(keys.collectionStatus);
  if (codes !== undefined) {
    return pickAllowed(codes, BUILT_IN_COLLECTION_STATUSES);
  }

  return collectionStatusFromLegacyIsComplete(read(keys.legacyIsComplete));
}

function pickAllowed<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T[] {
  const allowedSet = new Set<string>(allowed);
  return (value?.split(",") ?? []).filter((item): item is T =>
    allowedSet.has(item),
  );
}

/** The API sorts by one column; the first valid segment wins. */
function parseSort(value: string | undefined): SubmissionGridSort | undefined {
  const sortable = new Set<string>(SUBMISSION_GRID_SORT_FIELDS);
  for (const segment of value?.split(",") ?? []) {
    const [field, direction] = segment.trim().split(":");
    if (sortable.has(field) && (direction === "asc" || direction === "desc")) {
      return { field: field as SubmissionGridSortField, direction };
    }
  }

  return undefined;
}

function parseColumnKeys(value: string | undefined): string[] | undefined {
  const columns = [
    ...new Set(
      value
        ?.split(",")
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  ];
  return columns.length > 0 ? columns : undefined;
}

function writtenKeys(raw: SubmissionGridRawSearchParams): string[] {
  return [
    ...Object.values(keys),
    ...Object.keys(raw).filter(hasAnswerFilterPrefix),
  ];
}

function isWrittenDefault(key: string, value: string): boolean {
  return (
    (key === keys.page && value === String(SUBMISSION_GRID_DEFAULT_PAGE)) ||
    (key === keys.pageSize &&
      value === String(SUBMISSION_GRID_DEFAULT_PAGE_SIZE))
  );
}

function sortedQuery(params: URLSearchParams): string {
  const sorted = new URLSearchParams(params);
  sorted.sort();
  return sorted.toString();
}
