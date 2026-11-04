export const SUBMISSION_GRID_DEFAULT_PAGE = 1;
export const SUBMISSION_GRID_DEFAULT_PAGE_SIZE = 10;
export const SUBMISSION_GRID_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;
export const SUBMISSION_GRID_REVIEW_STATUS_VALUES = [
  "new",
  "read",
  "approved",
] as const;
export const SUBMISSION_GRID_BOOLEAN_VALUES = ["true", "false"] as const;
export const SUBMISSION_GRID_DATE_STEMS = [
  "created",
  "modified",
  "started",
  "completed",
] as const;

/** Columns the API can sort by. Answer columns do not sort yet. */
export const SUBMISSION_GRID_SORT_FIELDS = [
  "createdAt",
  "modifiedAt",
  "startedAt",
  "completedAt",
] as const;

/**
 * Keys on `/forms/:formId/submissions`. The route keeps the keys the list has
 * always used, so links and Back navigation work whichever grid renders them.
 */
export const SUBMISSION_GRID_URL_KEYS = Object.freeze({
  page: "page",
  pageSize: "pageSize",
  collectionStatus: "collectionStatus",
  status: "status",
  isTestSubmission: "isTestSubmission",
  createdFrom: "createdFrom",
  createdTo: "createdTo",
  modifiedFrom: "modifiedFrom",
  modifiedTo: "modifiedTo",
  startedFrom: "startedFrom",
  startedTo: "startedTo",
  completedFrom: "completedFrom",
  completedTo: "completedTo",
  submitterDisplayId: "submitterDisplayId",
  submitterEmail: "submitterEmail",
  /** `<column>:<asc|desc>` */
  sort: "sort",
  /** Visible answer column keys, comma-joined. Absent: the default view. */
  columns: "columns",
  /** Old completion flag; read once and rewritten as `collectionStatus`. */
  legacyIsComplete: "isComplete",
} as const);

/** Free-text filters, committed to the URL together by one debounced writer. */
export const SUBMISSION_GRID_TEXT_FILTER_KEYS = [
  SUBMISSION_GRID_URL_KEYS.submitterDisplayId,
  SUBMISSION_GRID_URL_KEYS.submitterEmail,
] as const;
